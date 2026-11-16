import type {
  CompletionRequest,
  CompletionResult,
  ConnectionTestResult,
  ModelOption,
  ProviderAdapter,
  ProviderConfig,
  StreamOptions,
} from "@plenz/types";
import { createProviderHttpError, outputBudget, parseJson, readErrorMessage } from "./http";
import { readSSE } from "./sse";

const API_URL = "https://generativelanguage.googleapis.com/v1beta";

export class GoogleAdapter implements ProviderAdapter {
  id = "google";
  name = "Google Gemini";

  async fetchModels(config: ProviderConfig): Promise<ModelOption[]> {
    if (!config.apiKey) return [];
    try {
      const res = await fetch(`${API_URL}/models`, {
        headers: { "X-goog-api-key": config.apiKey },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.models
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m: { name: string; displayName?: string }) => ({
          id: m.name.replace("models/", ""),
          name: m.displayName || m.name.replace("models/", ""),
          tier: m.name.includes("pro") ? "premium" : "standard",
        }));
    } catch {
      return [];
    }
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    if (!config.model) return { success: false, latencyMs: 0, error: "No model selected" };
    const start = performance.now();
    try {
      const res = await fetch(`${API_URL}/models/${config.model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": config.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }));
        return {
          success: false,
          latencyMs,
          error: err.error?.message || "Connection failed",
        };
      }
      return { success: true, latencyMs };
    } catch (e) {
      return { success: false, latencyMs: 0, error: (e as Error).message };
    }
  }

  async streamCompletion(
    request: CompletionRequest,
    config: ProviderConfig,
    options: StreamOptions = {},
  ): Promise<CompletionResult> {
    const start = performance.now();
    const res = await fetch(
      `${API_URL}/models/${config.model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": config.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: "user", parts: [{ text: request.user }] }],
          generationConfig: {
            maxOutputTokens: outputBudget(request.maxTokens, config.maxTokens),
            temperature: config.temperature ?? request.temperature,
          },
        }),
        signal: options.signal,
      },
    );

    if (!res.ok || !res.body) {
      throw createProviderHttpError(
        await readErrorMessage(res, "Gemini API error"),
        res.status,
      );
    }

    let text = "";
    const tokensUsed = { prompt: 0, completion: 0 };
    await readSSE(res.body, ({ data }) => {
      const event = parseJson(data);
      if (!event) return;
      if (event.error) throw new Error(event.error.message || "Gemini stream error");

      const parts = event.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          // Skip thought summaries from thinking models; keep the answer text.
          if (typeof part?.text === "string" && part.text && !part.thought) {
            text += part.text;
            options.onDelta?.(part.text);
          }
        }
      }
      if (event.usageMetadata) {
        tokensUsed.prompt = event.usageMetadata.promptTokenCount ?? tokensUsed.prompt;
        tokensUsed.completion =
          event.usageMetadata.candidatesTokenCount ?? tokensUsed.completion;
      }
    });

    return { text, tokensUsed, latencyMs: Math.round(performance.now() - start) };
  }
}
