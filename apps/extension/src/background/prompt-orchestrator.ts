import { providers } from "@plenz/providers";
import {
  buildSystemPrompt,
  EntityExtractor,
  IntentDetector,
  SuggestionValidationError,
  validateSuggestions,
} from "@plenz/core";
import type {
  AnalysisResult,
  ProviderAdapter,
  ProviderAnalyzeContext,
  ProviderConfig,
} from "@plenz/types";
import { StorageManager } from "./storage";

const ANALYSIS_TIMEOUT_MS = 12_000;

type AttemptInput = {
  provider: ProviderAdapter;
  config: ProviderConfig;
  prompt: string;
  systemPrompt: string;
  context?: ProviderAnalyzeContext;
};

type OrchestratedAnalysisResult = Pick<AnalysisResult, "suggestions" | "latencyMs"> & {
  providerId: string;
};

function getErrorStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
    ? (error as { status: number }).status
    : undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown analysis error";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function isRetryableError(error: unknown) {
  if (error instanceof SuggestionValidationError) return false;
  if (isAbortError(error)) return true;

  const status = getErrorStatus(error);
  if (status === 429 || (typeof status === "number" && status >= 500)) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("timed out")
  );
}

function getContextText(context?: ProviderAnalyzeContext) {
  const conversation = context?.conversation;
  if (!conversation) return "";

  return [
    conversation.rollingSummary,
    ...conversation.recentMessages.map((message) => message.text),
  ]
    .filter(Boolean)
    .join("\n");
}

async function analyzeWithTimeout(input: AttemptInput): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

  try {
    const result = await input.provider.analyze(
      input.prompt,
      input.systemPrompt,
      input.config,
      input.context,
      { signal: controller.signal },
    );
    const suggestions = validateSuggestions(result.suggestions, 5, input.prompt);
    return {
      ...result,
      suggestions,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function logAttemptFailure(providerId: string, error: unknown) {
  console.warn("plenz: provider analysis attempt failed", {
    providerId,
    status: getErrorStatus(error),
    message: getErrorMessage(error),
  });
}

async function getFallbackAttempts(activeProviderId: string | null) {
  const configsResult = await StorageManager.getAllModelConfigs();
  const configs = configsResult.data ?? {};
  const availableProviders: ProviderAdapter[] = providers;

  return availableProviders
    .filter((provider) => provider.id !== activeProviderId)
    .map((provider) => ({
      provider,
      config: configs[provider.id],
    }))
    .filter(
      (attempt): attempt is { provider: ProviderAdapter; config: ProviderConfig } =>
        !!attempt.config?.apiKey && !!attempt.config?.model,
    );
}

export async function analyzePromptWithOrchestration(
  prompt: string,
  context?: ProviderAnalyzeContext,
): Promise<OrchestratedAnalysisResult | { error: string }> {
  const prefs = await StorageManager.getPreferences();

  const activeConfigResult = await StorageManager.getActiveModelConfig();
  const activeConfig = activeConfigResult.data;

  if (!activeConfig?.apiKey || !activeConfig.model) {
    return {
      error:
        "LLM Provider not configured. Please set an API key and model in the extension options.",
    };
  }

  const activeProvider = providers.find((provider) => provider.id === prefs.activeProviderId);
  if (!activeProvider) {
    return {
      error: "Active LLM Provider not found. Please review your settings.",
    };
  }

  const analysisText = [prompt, getContextText(context)].filter(Boolean).join("\n\n");
  const intentDetector = new IntentDetector();
  const entityExtractor = new EntityExtractor();
  const intentMatch = intentDetector.detect(analysisText);
  const entities = entityExtractor.extract(analysisText, context);
  const systemPrompt = buildSystemPrompt(intentMatch, entities, context?.conversation);
  const failedErrors: unknown[] = [];

  try {
    const activeResult = await analyzeWithTimeout({
      provider: activeProvider,
      config: activeConfig,
      prompt,
      systemPrompt,
      context,
    });

    return {
      suggestions: activeResult.suggestions,
      latencyMs: activeResult.latencyMs,
      providerId: activeProvider.id,
    };
  } catch (error) {
    failedErrors.push(error);
    logAttemptFailure(activeProvider.id, error);

    if (isRetryableError(error)) {
      try {
        const retryResult = await analyzeWithTimeout({
          provider: activeProvider,
          config: activeConfig,
          prompt,
          systemPrompt,
          context,
        });

        return {
          suggestions: retryResult.suggestions,
          latencyMs: retryResult.latencyMs,
          providerId: activeProvider.id,
        };
      } catch (retryError) {
        failedErrors.push(retryError);
        logAttemptFailure(activeProvider.id, retryError);
      }
    }
  }

  const fallbackAttempts = await getFallbackAttempts(prefs.activeProviderId);
  for (const attempt of fallbackAttempts) {
    try {
      const fallbackResult = await analyzeWithTimeout({
        provider: attempt.provider,
        config: attempt.config,
        prompt,
        systemPrompt,
        context,
      });

      return {
        suggestions: fallbackResult.suggestions,
        latencyMs: fallbackResult.latencyMs,
        providerId: attempt.provider.id,
      };
    } catch (error) {
      failedErrors.push(error);
      logAttemptFailure(attempt.provider.id, error);
    }
  }

  const lastError = failedErrors[failedErrors.length - 1];
  return { error: getErrorMessage(lastError) || "Failed to analyze prompt." };
}
