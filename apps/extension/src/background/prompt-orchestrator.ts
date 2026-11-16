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
import {
  initialOrchestratorState,
  orchestratorTransition,
} from "./orchestrator-machine";

const ANALYSIS_TIMEOUT_MS = 12_000;

type AttemptInput = {
  provider: ProviderAdapter;
  config: ProviderConfig;
  prompt: string;
  systemPrompt: string;
  context?: ProviderAnalyzeContext;
  signal?: AbortSignal;
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
  const abortFromCaller = () => controller.abort();
  input.signal?.addEventListener("abort", abortFromCaller);
  if (input.signal?.aborted) controller.abort();

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
    input.signal?.removeEventListener("abort", abortFromCaller);
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

const CANCELLED_RESULT = { error: "Analysis cancelled.", cancelled: true } as const;

export async function analyzePromptWithOrchestration(
  prompt: string,
  context?: ProviderAnalyzeContext,
  signal?: AbortSignal,
): Promise<OrchestratedAnalysisResult | { error: string; cancelled?: boolean }> {
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
  // Sending the prompt to a provider the user didn't pick must be opted into.
  // Fallbacks are only loaded once the active provider has failed.
  let fallbackAttempts: Awaited<ReturnType<typeof getFallbackAttempts>> | null =
    prefs.providerFallbackEnabled ? null : [];
  let state = initialOrchestratorState<unknown>();

  while (state.kind === "attempting") {
    if (signal?.aborted) {
      state = orchestratorTransition(state, { type: "CANCELLED" }, { fallbackCount: 0 });
      break;
    }

    const { target } = state;
    const attempt =
      target.kind === "fallback"
        ? fallbackAttempts?.[target.index]
        : { provider: activeProvider, config: activeConfig };
    if (!attempt) break;

    try {
      const result = await analyzeWithTimeout({
        provider: attempt.provider,
        config: attempt.config,
        prompt,
        systemPrompt,
        context,
        signal,
      });
      state = orchestratorTransition(state, { type: "ATTEMPT_SUCCEEDED" }, { fallbackCount: 0 });

      return {
        suggestions: result.suggestions,
        latencyMs: result.latencyMs,
        providerId: attempt.provider.id,
      };
    } catch (error) {
      logAttemptFailure(attempt.provider.id, error);
      fallbackAttempts ??= await getFallbackAttempts(prefs.activeProviderId);
      state = orchestratorTransition(
        state,
        signal?.aborted
          ? { type: "CANCELLED" }
          : { type: "ATTEMPT_FAILED", error, retryable: isRetryableError(error) },
        { fallbackCount: fallbackAttempts.length },
      );
    }
  }

  if (state.kind === "cancelled") return CANCELLED_RESULT;

  const lastError = state.kind === "failed" ? state.error : undefined;
  return { error: getErrorMessage(lastError) || "Failed to analyze prompt." };
}
