import type {
  CompletionRequest,
  CompletionResult,
  ConnectionTestResult,
  ModelOption,
  ProviderAdapter,
  ProviderConfig,
  StreamOptions,
} from "@plenz/types";
import { modelsUrlFor, resolveChatCompletionsUrl } from "./endpoints";
import {
  createProviderHttpError,
  outputBudget,
  parseJson,
  readErrorMessage,
} from "./http";
import { isEventStream, readSSE } from "./sse";

type RawModel = { id: string; name?: string; pricing?: { prompt?: number | string } };

/** One OpenAI-compatible API: a fixed vendor, or a user-supplied endpoint. */
export interface OpenAICompatiblePreset {
  id: string;
  name: string;
  /** Vendor base URL. Omit to use the user's `baseUrl` setting instead. */
  baseUrl?: string;
  /** Used when the preset has no baseUrl and the user left theirs empty. */
  defaultBaseUrl?: string;
  /** Skip the models request when there is no key. */
  requiresKey: boolean;
  headers?: Record<string, string>;
  toModels(models: RawModel[]): ModelOption[];
}

const byIdDescending = (a: ModelOption, b: ModelOption) => b.id.localeCompare(a.id);

export const OPENAI_COMPATIBLE_PRESETS: OpenAICompatiblePreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    requiresKey: true,
    toModels: (models) =>
      models
        .filter((m) => m.id.includes("gpt") || m.id.includes("o1") || m.id.includes("o3"))
        .map((m): ModelOption => ({
          id: m.id,
          name: m.id,
          tier:
            m.id.includes("4") || m.id.includes("o1") || m.id.includes("o3")
              ? "premium"
              : "standard",
        }))
        .sort(byIdDescending),
  },
  {
    id: "mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    requiresKey: true,
    toModels: (models) =>
      models.map((m) => ({
        id: m.id,
        name: m.name || m.id,
        tier: m.id.includes("large") ? "premium" : "standard",
      })),
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresKey: true,
    toModels: (models) =>
      models.map((m) => ({
        id: m.id,
        name: m.name || m.id,
        tier: m.id.includes("70b") ? "premium" : "standard",
      })),
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresKey: true,
    headers: {
      "HTTP-Referer": "https://github.com/i-see-pixels/plenz",
      "X-Title": "plenz",
    },
    toModels: (models) =>
      models.map((m) => ({
        id: m.id,
        name: m.name || m.id,
        tier: Number(m.pricing?.prompt) > 0 ? "premium" : "standard",
      })),
  },
  {
    id: "custom",
    name: "Custom Provider",
    // Local OpenAI-compatible servers (Ollama) by default.
    defaultBaseUrl: "http://localhost:11434/v1",
    requiresKey: false,
    toModels: (models) =>
      models.map((m) => ({ id: m.id, name: m.name || m.id, tier: "standard" })),
  },
];

export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly id: string;
  readonly name: string;

  constructor(private readonly preset: OpenAICompatiblePreset) {
    this.id = preset.id;
    this.name = preset.name;
  }

  private endpoint(config: ProviderConfig) {
    const base =
      this.preset.baseUrl || config.baseUrl?.trim() || this.preset.defaultBaseUrl || "";
    return resolveChatCompletionsUrl(base);
  }

  private headers(config: ProviderConfig, json: boolean) {
    const headers: Record<string, string> = { ...this.preset.headers };
    if (json) headers["Content-Type"] = "application/json";
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
    return headers;
  }

  async fetchModels(config: ProviderConfig): Promise<ModelOption[]> {
    if (this.preset.requiresKey && !config.apiKey) return [];
    try {
      const res = await fetch(modelsUrlFor(this.endpoint(config)), {
        headers: this.headers(config, false),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.data) ? this.preset.toModels(data.data) : [];
    } catch {
      return [];
    }
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    if (!config.model) return { success: false, latencyMs: 0, error: "No model selected" };
    const start = performance.now();
    try {
      const res = await fetch(this.endpoint(config), {
        method: "POST",
        headers: this.headers(config, true),
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          error: await readErrorMessage(res, `HTTP ${res.status}`),
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
    const res = await fetch(this.endpoint(config), {
      method: "POST",
      headers: this.headers(config, true),
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        max_tokens: outputBudget(request.maxTokens, config.maxTokens),
        temperature: config.temperature ?? request.temperature,
        stream: true,
        stream_options: this.preset.id === "openai" ? { include_usage: true } : undefined,
      }),
      signal: options.signal,
    });

    if (!res.ok) {
      throw createProviderHttpError(
        await readErrorMessage(res, `${this.name} API error`),
        res.status,
      );
    }

    let text = "";
    const tokensUsed = { prompt: 0, completion: 0 };
    const emit = (chunk: unknown) => {
      if (typeof chunk !== "string" || !chunk) return;
      text += chunk;
      options.onDelta?.(chunk);
    };
    const readUsage = (usage: any) => {
      if (!usage) return;
      tokensUsed.prompt = usage.prompt_tokens ?? tokensUsed.prompt;
      tokensUsed.completion = usage.completion_tokens ?? tokensUsed.completion;
    };

    if (res.body && isEventStream(res)) {
      await readSSE(res.body, ({ data }) => {
        if (data === "[DONE]") return;
        const event = parseJson(data);
        if (!event) return;
        if (event.error) throw new Error(event.error.message || `${this.name} stream error`);
        emit(event.choices?.[0]?.delta?.content);
        readUsage(event.usage);
      });
    } else {
      // Some OpenAI-compatible servers ignore `stream`; take the whole reply.
      const data = await res.json().catch(() => {
        throw new Error(`Failed to parse response from ${this.name}`);
      });
      emit(data?.choices?.[0]?.message?.content);
      readUsage(data?.usage);
    }

    return { text, tokensUsed, latencyMs: Math.round(performance.now() - start) };
  }
}
