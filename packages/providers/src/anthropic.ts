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
  normalizeSuggestions,
  parseSuggestionsText,
  SUGGESTIONS_JSON_SCHEMA,
} from "./response-parsing";

const API_URL = "https://api.anthropic.com/v1";
const SUGGESTIONS_TOOL = "submit_suggestions";

function headers(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; name: string; input: Record<string, unknown> }
  | { type: string };

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

  async analyze(
    prompt: string,
    systemPrompt: string,
    config: ProviderConfig,
    context?: ProviderAnalyzeContext,
    options?: ProviderAnalyzeOptions,
  ): Promise<AnalysisResult> {
    const start = performance.now();
    const res = await fetch(`${API_URL}/messages`, {
      method: "POST",
      headers: headers(config.apiKey),
      body: JSON.stringify({
        model: config.model,
        system: systemPrompt,
        messages: [{ role: "user", content: formatAnalysisUserPrompt(prompt, context) }],
        max_tokens: config.maxTokens ?? DEFAULT_ANALYSIS_MAX_TOKENS,
        temperature: config.temperature ?? DEFAULT_ANALYSIS_TEMPERATURE,
        // Forcing the tool makes the reply structured input instead of JSON-in-text.
        tools: [
          {
            name: SUGGESTIONS_TOOL,
            description: "Return the refined prompt suggestions.",
            input_schema: SUGGESTIONS_JSON_SCHEMA,
          },
        ],
        tool_choice: { type: "tool", name: SUGGESTIONS_TOOL },
      }),
      signal: options?.signal,
    });
    const data = await res.json();
    const latencyMs = Math.round(performance.now() - start);

    if (!res.ok) {
      throw createProviderHttpError(data.error?.message || "Anthropic API error", res.status);
    }

    const blocks: ContentBlock[] = Array.isArray(data.content) ? data.content : [];
    const toolUse = blocks.find(
      (block): block is Extract<ContentBlock, { type: "tool_use" }> =>
        block.type === "tool_use" && "name" in block && block.name === SUGGESTIONS_TOOL,
    );
    const toolSuggestions = normalizeSuggestions(toolUse?.input?.suggestions);
    const text = blocks
      .map((block) => (block.type === "text" && "text" in block ? block.text : ""))
      .join("\n");

    return {
      suggestions:
        toolSuggestions.length > 0 ? toolSuggestions : parseSuggestionsText(text, this.name),
      rawResponse: JSON.stringify(data),
      tokensUsed: {
        prompt: data.usage?.input_tokens ?? 0,
        completion: data.usage?.output_tokens ?? 0,
      },
      latencyMs,
    };
  }
}
