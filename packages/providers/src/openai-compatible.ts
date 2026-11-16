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
import {
  modelsUrlFor,
  parseSuggestionsText,
  resolveChatCompletionsUrl,
} from "./response-parsing";

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
  /** Ask for `response_format: json_object` (not every endpoint supports it). */
  jsonMode: boolean;
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
    jsonMode: true,
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
    jsonMode: true,
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
    jsonMode: true,
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
    // Some routed models reject response_format, so rely on prompt + parsing.
    jsonMode: false,
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
    jsonMode: false,
    toModels: (models) =>
      models.map((m) => ({ id: m.id, name: m.name || m.id, tier: "standard" })),
  },
];

async function readErrorMessage(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  return body?.error?.message || body?.message || fallback;
}

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

  async analyze(
    prompt: string,
    systemPrompt: string,
    config: ProviderConfig,
    context?: ProviderAnalyzeContext,
    options?: ProviderAnalyzeOptions,
  ): Promise<AnalysisResult> {
    const start = performance.now();
    const res = await fetch(this.endpoint(config), {
      method: "POST",
      headers: this.headers(config, true),
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: formatAnalysisUserPrompt(prompt, context) },
        ],
        max_tokens: config.maxTokens ?? DEFAULT_ANALYSIS_MAX_TOKENS,
        temperature: config.temperature ?? DEFAULT_ANALYSIS_TEMPERATURE,
        ...(this.preset.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: options?.signal,
    });

    const data = await res.json().catch(() => {
      throw new Error(`Failed to parse response from ${this.name}`);
    });
    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      throw createProviderHttpError(
        data?.error?.message || `${this.name} API error`,
        res.status,
      );
    }

    const content = data.choices?.[0]?.message?.content;
    return {
      suggestions: parseSuggestionsText(
        typeof content === "string" ? content : "",
        this.name,
      ),
      rawResponse: JSON.stringify(data),
      tokensUsed: {
        prompt: data.usage?.prompt_tokens ?? 0,
        completion: data.usage?.completion_tokens ?? 0,
      },
      latencyMs,
    };
  }
}
