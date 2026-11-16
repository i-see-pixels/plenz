import type {
  CompletionRequest,
  CompletionResult,
  ConnectionTestResult,
  ModelOption,
  ProviderAdapter,
  ProviderConfig,
  StreamOptions,
} from "@plenz/types";
import { createProviderHttpError, parseJson, readErrorMessage } from "./http";
import { readSSE } from "./sse";

const API_URL = "https://api.anthropic.com/v1";

function headers(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

export class AnthropicAdapter implements ProviderAdapter {
  id = "anthropic";
  name = "Anthropic";

  async fetchModels(config: ProviderConfig): Promise<ModelOption[]> {
    if (!config.apiKey) return [];
    try {
      const res = await fetch(`${API_URL}/models`, { headers: headers(config.apiKey) });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data.map((m: { id: string; display_name?: string }) => ({
        id: m.id,
        name: m.display_name || m.id,
        tier:
          m.id.includes("opus") || m.id.includes("sonnet-2024") ? "premium" : "standard",
      }));
    } catch {
      return [];
    }
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    if (!config.model) return { success: false, latencyMs: 0, error: "No model selected" };
    const start = performance.now();
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: headers(config.apiKey),
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }));
        return { success: false, latencyMs, error: err.error?.message };
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
    const res = await fetch(`${API_URL}/messages`, {
      method: "POST",
      headers: headers(config.apiKey),
      body: JSON.stringify({
        model: config.model,
        system: request.system,
        messages: [{ role: "user", content: request.user }],
        max_tokens: config.maxTokens ?? request.maxTokens,
        temperature: config.temperature ?? request.temperature,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!res.ok || !res.body) {
      throw createProviderHttpError(
        await readErrorMessage(res, "Anthropic API error"),
        res.status,
      );
    }

    let text = "";
    const tokensUsed = { prompt: 0, completion: 0 };
    await readSSE(res.body, ({ data }) => {
      const event = parseJson(data);
      switch (event?.type) {
        case "message_start":
          tokensUsed.prompt = event.message?.usage?.input_tokens ?? 0;
          break;
        case "content_block_delta":
          if (event.delta?.type === "text_delta" && event.delta.text) {
            text += event.delta.text;
            options.onDelta?.(event.delta.text);
          }
          break;
        case "message_delta":
          tokensUsed.completion = event.usage?.output_tokens ?? tokensUsed.completion;
          break;
        case "error":
          throw new Error(event.error?.message || "Anthropic stream error");
      }
    });

    return { text, tokensUsed, latencyMs: Math.round(performance.now() - start) };
  }
}
