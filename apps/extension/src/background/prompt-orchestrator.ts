import {
  isProviderConfigured,
  ON_DEVICE_MODEL_ID,
  ON_DEVICE_PROVIDER_ID,
  onDeviceAvailability,
  onDeviceStatusMessage,
  providers,
} from "@plenz/providers";
import {
  buildRefineRequest,
  cleanRefineOutput,
  parseClarifyingQuestions,
} from "@plenz/core";
import type { CompletionResult, ProviderAdapter, ProviderConfig } from "@plenz/types";
import { StorageManager } from "./storage";
import {
  initialOrchestratorState,
  orchestratorTransition,
} from "./orchestrator-machine";
import type { RefineStart } from "../shared/refine-port";

/** No first token by then: treat as a timeout (retryable). */
const FIRST_TOKEN_TIMEOUT_MS = 20_000;
/** A stream that goes quiet this long mid-reply is abandoned. */
const IDLE_TIMEOUT_MS = 30_000;

type Attempt = { provider: ProviderAdapter; config: ProviderConfig };

export type RefineOutcome =
  | { kind: "text"; text: string; providerId: string }
  | { kind: "questions"; questions: string[]; providerId: string }
  | { kind: "error"; message: string; cancelled?: boolean };

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
  return "Unknown refine error";
}

function isRetryableError(error: unknown) {
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

/** One provider call, with a first-token timeout and an idle timeout. */
async function streamAttempt(
  attempt: Attempt,
  request: ReturnType<typeof buildRefineRequest>,
  signal: AbortSignal,
  onDelta: (text: string) => void,
): Promise<CompletionResult> {
  const controller = new AbortController();
  let timedOut = false;
  const onTimeout = () => {
    timedOut = true;
    controller.abort();
  };
  let timer = setTimeout(onTimeout, FIRST_TOKEN_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal.addEventListener("abort", abortFromCaller);
  if (signal.aborted) controller.abort();

  try {
    return await attempt.provider.streamCompletion(request, attempt.config, {
      signal: controller.signal,
      onDelta: (text) => {
        clearTimeout(timer);
        timer = setTimeout(onTimeout, IDLE_TIMEOUT_MS);
        onDelta(text);
      },
    });
  } catch (error) {
    if (timedOut && !signal.aborted) {
      throw new Error("Timed out waiting for the provider.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abortFromCaller);
  }
}

function logAttemptFailure(providerId: string, error: unknown) {
  console.warn("plenz: provider refine attempt failed", {
    providerId,
    status: getErrorStatus(error),
    message: getErrorMessage(error),
  });
}

async function getFallbackAttempts(primaryProviderId: string) {
  const configsResult = await StorageManager.getAllModelConfigs();
  const configs = configsResult.data ?? {};
  const availableProviders: ProviderAdapter[] = providers;

  return availableProviders
    .filter((provider) => provider.id !== primaryProviderId)
    .map((provider) => ({
      provider,
      config: configs[provider.id],
    }))
    .filter((attempt): attempt is Attempt =>
      isProviderConfigured(attempt.provider, attempt.config),
    );
}

const CANCELLED: RefineOutcome = { kind: "error", message: "Refine cancelled.", cancelled: true };

/**
 * Run one refine. Retries and (opt-in) fallbacks only happen before the first
 * chunk reaches the user; restarting mid-stream would duplicate text.
 */
export async function runRefine(
  start: RefineStart,
  options: { signal: AbortSignal; onDelta: (text: string) => void },
): Promise<RefineOutcome> {
  const { signal } = options;
  const prefs = await StorageManager.getPreferences();
  const activeConfig = (await StorageManager.getActiveModelConfig()).data;

  const activeProvider = providers.find((provider) => provider.id === prefs.activeProviderId);
  let primary: Attempt;
  if (activeProvider && activeConfig && isProviderConfigured(activeProvider, activeConfig)) {
    primary = { provider: activeProvider, config: activeConfig };
  } else {
    // Nothing set up: use Chrome's on-device model if it's already downloaded.
    const availability = await onDeviceAvailability();
    const onDevice = providers.find((provider) => provider.id === ON_DEVICE_PROVIDER_ID);
    if (availability !== "available" || !onDevice) {
      return {
        kind: "error",
        message:
          availability === "unavailable"
            ? "No AI provider is set up. Add an API key in the extension settings."
            : `No AI provider is set up. ${onDeviceStatusMessage(availability)}`,
      };
    }
    primary = { provider: onDevice, config: { apiKey: "", model: ON_DEVICE_MODEL_ID } };
  }

  const request = buildRefineRequest({
    step: start.step,
    draft: start.draft,
    context: start.context,
    missing: start.missing,
    answers: start.answers,
  });
  // Ask me questions are shown once complete, not streamed.
  const streamsToUser = start.step !== "ask";
  let sentToUser = false;
  const onDelta = (text: string) => {
    if (!streamsToUser) return;
    sentToUser = true;
    options.onDelta(text);
  };

  // Sending the prompt to a provider the user didn't pick must be opted into.
  // Fallbacks are only loaded once the active provider has failed.
  let fallbackAttempts: Attempt[] | null = prefs.providerFallbackEnabled ? null : [];
  let state = initialOrchestratorState<unknown>();

  while (state.kind === "attempting") {
    if (signal.aborted) return CANCELLED;

    const { target } = state;
    const attempt: Attempt | undefined =
      target.kind === "fallback"
        ? fallbackAttempts?.[target.index]
        : primary;
    if (!attempt) break;

    try {
      const result = await streamAttempt(attempt, request, signal, onDelta);
      state = orchestratorTransition(state, { type: "ATTEMPT_SUCCEEDED" }, { fallbackCount: 0 });

      if (start.step === "ask") {
        const questions = parseClarifyingQuestions(result.text);
        return questions.length > 0
          ? { kind: "questions", questions, providerId: attempt.provider.id }
          : { kind: "error", message: "No clarifying questions came back. Try another mode." };
      }

      const text = cleanRefineOutput(result.text);
      return text
        ? { kind: "text", text, providerId: attempt.provider.id }
        : { kind: "error", message: "The provider returned an empty prompt. Try again." };
    } catch (error) {
      if (signal.aborted) return CANCELLED;
      logAttemptFailure(attempt.provider.id, error);
      if (sentToUser) {
        return { kind: "error", message: getErrorMessage(error) || "The refine stopped early." };
      }
      fallbackAttempts ??= await getFallbackAttempts(primary.provider.id);
      state = orchestratorTransition(
        state,
        { type: "ATTEMPT_FAILED", error, retryable: isRetryableError(error) },
        { fallbackCount: fallbackAttempts.length },
      );
    }
  }

  const lastError = state.kind === "failed" ? state.error : undefined;
  return { kind: "error", message: getErrorMessage(lastError) || "Failed to refine prompt." };
}
