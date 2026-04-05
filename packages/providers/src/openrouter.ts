import {
  ProviderAdapter,
  ProviderConfig,
  ConnectionTestResult,
  AnalysisResult,
  Suggestion,
  ModelOption,
} from "@plenz/types";

export class OpenRouterAdapter implements ProviderAdapter {
  id = "openrouter";
  name = "OpenRouter";

  async fetchModels(config: ProviderConfig): Promise<ModelOption[]> {
    if (!config.apiKey) return [];
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data.map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        tier: m.pricing?.prompt > 0 ? "premium" : "standard"
      }));
    } catch {
      return [];
    }
  }

  private normalizeSuggestions(raw: unknown): Suggestion[] {
    const validTypes: Suggestion["type"][] = [
      "rewrite",
      "add_context",
      "add_constraints",
      "add_role",
      "add_format",
      "clarify",
    ];

    if (!Array.isArray(raw)) return [];

    return raw
      .map((item, idx) => {
        const value = item as Record<string, unknown>;

        const suggested =
          (typeof value.suggested === "string" && value.suggested) ||
          (typeof value.suggested_text === "string" && value.suggested_text) ||
          "";
        if (!suggested) return null;

        const original =
          (typeof value.original === "string" && value.original) ||
          (typeof value.original_text === "string" && value.original_text) ||
          "";

        const type = validTypes.includes(value.type as Suggestion["type"])
          ? (value.type as Suggestion["type"])
          : "clarify";

        const confidenceValue =
          typeof value.confidence === "number" ? value.confidence : 0.7;
        const confidence = Math.max(0, Math.min(1, confidenceValue));

        return {
          id:
            (typeof value.id === "string" && value.id) ||
            `suggestion-${idx + 1}`,
          type,
          original,
          suggested,
          rationale:
            (typeof value.rationale === "string" && value.rationale) ||
            "Improves prompt clarity.",
          confidence,
        };
      })
      .filter((item): item is Suggestion => item !== null);
  }

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    if (!config.model) return { success: false, latencyMs: 0, error: "No model selected" };
    const start = performance.now();
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "HTTP-Referer": "https://github.com/i-see-pixels/plenz",
          "X-Title": "plenz",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });
      const latency = Math.round(performance.now() - start);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
        return {
          success: false,
          latencyMs: latency,
          error: err.error?.message,
        };
      }
      return { success: true, latencyMs: latency };
    } catch (e) {
      return { success: false, latencyMs: 0, error: (e as Error).message };
    }
  }

  private extractJson(text: string): Record<string, unknown> {
    const trimmed = text.trim();
    const candidates = [trimmed];

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      candidates.push(fencedMatch[1].trim());
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as Record<string, unknown>;
      } catch {
        // Try next candidate.
      }
    }

    throw new Error("Invalid JSON response from OpenRouter");
  }

  async analyze(
    prompt: string,
    systemPrompt: string,
    config: ProviderConfig,
    context?: { active_website?: string },
  ): Promise<AnalysisResult> {
    const start = performance.now();
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": "https://github.com/i-see-pixels/plenz",
        "X-Title": "plenz",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: context?.active_website
              ? `[Context: ${context.active_website}]\n\n${prompt}`
              : prompt,
          },
        ],
        max_tokens: config.maxTokens ?? 1024,
        temperature: config.temperature ?? 0.3,
        // Some OpenRouter models support response_format: { type: "json_object" }, but some don't.
        // We won't strictly enforce json_object to broadly support more models.
      }),
    });
    const data = await res.json();
    const latency = Math.round(performance.now() - start);

    if (!res.ok) {
      throw new Error(data.error?.message || "OpenRouter API error");
    }

    const content = data.choices?.[0]?.message?.content;
    let parsed: Record<string, unknown> = {};
    if (typeof content === "string" && content.trim()) {
      try {
        parsed = this.extractJson(content);
      } catch {
        throw new Error("Invalid JSON response from OpenRouter");
      }
    }

    const suggestions = this.normalizeSuggestions(parsed.suggestions);

    return {
      suggestions,
      rawResponse: JSON.stringify(data),
      tokensUsed: {
        prompt: data.usage?.prompt_tokens ?? 0,
        completion: data.usage?.completion_tokens ?? 0,
      },
      latencyMs: latency,
    };
  }
}

