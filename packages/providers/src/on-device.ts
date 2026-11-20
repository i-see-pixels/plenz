// Chrome's built-in Gemini Nano via the Prompt API: refines on the device,
// with no API key and no network call. Feature-detected at runtime, since it
// depends on the Chrome version, the hardware and a one-time model download.
// Self-contained (type-only imports) so it can be tested with a fake API.

import type {
  CompletionRequest,
  CompletionResult,
  ConnectionTestResult,
  ModelOption,
  ProviderAdapter,
  ProviderConfig,
  StreamOptions,
} from "@plenz/types";

export const ON_DEVICE_PROVIDER_ID = "on-device";
export const ON_DEVICE_MODEL_ID = "gemini-nano";

export type OnDeviceAvailability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

// The parts of the Prompt API we use (no official TypeScript types yet).
type LanguageModelSession = {
  promptStreaming(
    input: string,
    options?: { signal?: AbortSignal },
  ): ReadableStream<string>;
  destroy(): void;
};
type DownloadMonitor = {
  addEventListener(
    type: "downloadprogress",
    listener: (event: { loaded: number }) => void,
  ): void;
};
type LanguageModelApi = {
  availability(options?: object): Promise<OnDeviceAvailability>;
  params?(): Promise<{
    defaultTopK: number;
    maxTopK: number;
    defaultTemperature: number;
    maxTemperature: number;
  }>;
  create(options?: object): Promise<LanguageModelSession>;
};

/**
 * Declared so availability() and create() agree. English is supported on
 * every Chrome version with the API; the model still answers in the draft's
 * language where it can.
 */
const LANGUAGE_OPTIONS = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

function api(): LanguageModelApi | null {
  return (
    (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel ?? null
  );
}

export async function onDeviceAvailability(): Promise<OnDeviceAvailability> {
  const languageModel = api();
  if (!languageModel) return "unavailable";
  try {
    return await languageModel.availability(LANGUAGE_OPTIONS);
  } catch {
    return "unavailable";
  }
}

export function onDeviceStatusMessage(
  availability: OnDeviceAvailability,
): string {
  switch (availability) {
    case "available":
      return "Ready. Runs on this device; no API key or network needed.";
    case "downloadable":
      return "The on-device model isn't downloaded yet. Download it in Settings, or add an API key.";
    case "downloading":
      return "The on-device model is still downloading. Try again when it finishes.";
    case "unavailable":
      return "This browser or device can't run Chrome's on-device model.";
  }
}

/**
 * Downloads the model (a one-time, multi-GB download). Call from a page in
 * response to a click; Chrome requires a user gesture to start it there.
 */
export async function downloadOnDeviceModel(
  onProgress: (fraction: number) => void,
) {
  const languageModel = api();
  if (!languageModel) throw new Error(onDeviceStatusMessage("unavailable"));
  const session = await languageModel.create({
    ...LANGUAGE_OPTIONS,
    monitor(monitor: DownloadMonitor) {
      monitor.addEventListener("downloadprogress", (event) =>
        onProgress(event.loaded),
      );
    },
  });
  session.destroy();
}

function friendlyError(error: unknown): Error {
  const name = (error as { name?: string })?.name;
  if (name === "QuotaExceededError") {
    return new Error(
      "This draft is too long for the on-device model. Try Tighten on a shorter draft, or add an API key.",
    );
  }
  if (name === "NotSupportedError") {
    return new Error(
      "The on-device model doesn't support this request. Try an API key provider.",
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

export class OnDeviceAdapter implements ProviderAdapter {
  id = ON_DEVICE_PROVIDER_ID;
  name = "On-device (Gemini Nano)";
  needsApiKey = false;

  async fetchModels(): Promise<ModelOption[]> {
    return (await onDeviceAvailability()) === "unavailable"
      ? []
      : [{ id: ON_DEVICE_MODEL_ID, name: "Gemini Nano", tier: "budget" }];
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    const availability = await onDeviceAvailability();
    return availability === "available"
      ? { success: true, latencyMs: Math.round(performance.now() - start) }
      : {
          success: false,
          latencyMs: 0,
          error: onDeviceStatusMessage(availability),
        };
  }

  async streamCompletion(
    request: CompletionRequest,
    _config: ProviderConfig,
    options: StreamOptions = {},
  ): Promise<CompletionResult> {
    const start = performance.now();
    const languageModel = api();
    const availability = await onDeviceAvailability();
    // Never start a multi-GB download from a refine; that's an explicit choice in Settings.
    if (!languageModel || availability !== "available") {
      throw new Error(onDeviceStatusMessage(availability));
    }

    // In extensions, temperature and topK must be given together.
    const params = await languageModel.params?.().catch(() => null);
    const session = await languageModel
      .create({
        ...LANGUAGE_OPTIONS,
        initialPrompts: [{ role: "system", content: request.system }],
        temperature: Math.min(request.temperature, params?.maxTemperature ?? 2),
        topK: params?.defaultTopK ?? 3,
        signal: options.signal,
      })
      .catch((error: unknown) => {
        throw friendlyError(error);
      });

    let text = "";
    try {
      const reader = session
        .promptStreaming(request.user, { signal: options.signal })
        .getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        // Chunks are deltas: each is the next piece of the reply.
        if (value) {
          text += value;
          options.onDelta?.(value);
        }
      }
    } catch (error) {
      throw friendlyError(error);
    } finally {
      session.destroy();
    }

    return {
      text,
      tokensUsed: { prompt: 0, completion: 0 },
      latencyMs: Math.round(performance.now() - start),
    };
  }
}
