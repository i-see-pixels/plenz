import type {
  AnalysisResult,
  ConnectionTestResult,
  ModelOption,
  ProviderAdapter,
  ProviderAnalyzeContext,
  ProviderAnalyzeOptions,
  ProviderConfig,
} from "@plenz/types";
import {
  createProviderHttpError,
  DEFAULT_ANALYSIS_MAX_TOKENS,
  DEFAULT_ANALYSIS_TEMPERATURE,
  formatAnalysisUserPrompt,
} from "./analysis-context";
import { parseSuggestionsText } from "./response-parsing";

const API_URL = "https://generativelanguage.googleapis.com/v1beta";

export class GoogleAdapter implements ProviderAdapter {
  id = "google";
  name = "Google Gemini";

  private getUrl(model: string) {
    return `${API_URL}/models/${model}:generateContent`;
  }

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
      const res = await fetch(this.getUrl(config.model), {
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

  async analyze(
    prompt: string,
    systemPrompt: string,
    config: ProviderConfig,
    context?: ProviderAnalyzeContext,
    options?: ProviderAnalyzeOptions,
  ): Promise<AnalysisResult> {
    const start = performance.now();
    const res = await fetch(this.getUrl(config.model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": config.apiKey,
      },
      body: JSON.stringify({
        // A real system instruction, instead of a first user turn.
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [{ text: formatAnalysisUserPrompt(prompt, context) }],
          },
        ],
        generationConfig: {
          maxOutputTokens: config.maxTokens ?? DEFAULT_ANALYSIS_MAX_TOKENS,
          temperature: config.temperature ?? DEFAULT_ANALYSIS_TEMPERATURE,
          responseMimeType: "application/json",
        },
      }),
      signal: options?.signal,
    });

    const data = await res.json();
    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      throw createProviderHttpError(data.error?.message || "Gemini API error", res.status);
    }

    const parts = data.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts
          .map((part: { text?: unknown }) => (typeof part.text === "string" ? part.text : ""))
          .join("\n")
      : "";

    let suggestions: AnalysisResult["suggestions"] = [];
    try {
      suggestions = parseSuggestionsText(text, "Gemini");
    } catch {
      // Gemini previously returned no suggestions rather than failing.
    }

    return {
      suggestions,
      rawResponse: JSON.stringify(data),
      tokensUsed: {
        prompt: data.usageMetadata?.promptTokenCount ?? 0,
        completion: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      latencyMs,
    };
  }
}
