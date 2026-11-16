// One parse step for every provider: pull a JSON object out of model text,
// recover complete suggestions from truncated output, and normalize them.
// Quality filtering happens later in @plenz/core (validateSuggestions).

import type { Suggestion } from "@plenz/types";

const VALID_TYPES: Suggestion["type"][] = [
  "rewrite",
  "add_context",
  "add_constraints",
  "add_role",
  "add_format",
  "clarify",
];

/** JSON schema of the reply, for providers with tool calling / structured output. */
export const SUGGESTIONS_JSON_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: VALID_TYPES },
          original: { type: "string" },
          suggested: { type: "string" },
          rationale: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["type", "suggested", "rationale", "confidence"],
      },
    },
  },
  required: ["suggestions"],
} as const;

function pickString(value: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return "";
}

export function normalizeSuggestions(raw: unknown): Suggestion[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, idx): Suggestion | null => {
      if (!item || typeof item !== "object") return null;
      const value = item as Record<string, unknown>;

      const suggested = pickString(value, "suggested", "suggested_text");
      if (!suggested) return null;

      const type = VALID_TYPES.includes(value.type as Suggestion["type"])
        ? (value.type as Suggestion["type"])
        : "clarify";
      const confidence =
        typeof value.confidence === "number" ? value.confidence : 0.7;

      return {
        id: pickString(value, "id") || `suggestion-${idx + 1}`,
        type,
        original: pickString(value, "original", "original_text"),
        suggested,
        rationale: pickString(value, "rationale") || "Improves prompt clarity.",
        confidence: Math.max(0, Math.min(1, confidence)),
      };
    })
    .filter((item): item is Suggestion => item !== null);
}

/** Parse a JSON object from raw text, a ```json fence, or the outermost braces. */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const candidates = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

/**
 * When output is cut off (e.g. the token limit), keep every suggestion object
 * that was completed before the cut.
 */
export function recoverTruncatedSuggestions(text: string): unknown[] {
  const keyIndex = text.indexOf('"suggestions"');
  if (keyIndex === -1) return [];
  const arrayStart = text.indexOf("[", keyIndex);
  if (arrayStart === -1) return [];

  const items: unknown[] = [];
  let inString = false;
  let escaped = false;
  let depth = 0;
  let objectStart = -1;

  for (let i = arrayStart + 1; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      if (depth === 0) objectStart = i;
      depth++;
    } else if (ch === "}" && depth > 0) {
      depth--;
      if (depth === 0 && objectStart !== -1) {
        try {
          items.push(JSON.parse(text.slice(objectStart, i + 1)));
        } catch {
          // Ignore malformed fragments.
        }
        objectStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      break;
    }
  }

  return items;
}

/**
 * Model text → suggestions. Empty text gives no suggestions; text with no
 * usable JSON at all throws, naming the provider.
 */
export function parseSuggestionsText(text: string, providerName: string): Suggestion[] {
  if (!text.trim()) return [];

  const parsed = extractJsonObject(text);
  if (parsed) return normalizeSuggestions(parsed.suggestions);

  const recovered = normalizeSuggestions(recoverTruncatedSuggestions(text));
  if (recovered.length > 0) return recovered;

  throw new Error(`Invalid JSON response from ${providerName}`);
}

/**
 * Accepts a provider base URL or a full chat completions endpoint and returns
 * the chat completions endpoint.
 */
export function resolveChatCompletionsUrl(baseUrl: string): string {
  let formatted = baseUrl.trim();
  if (formatted.endsWith("/")) formatted = formatted.slice(0, -1);

  try {
    const pathname = new URL(formatted).pathname.replace(/\/+$/, "");
    return pathname.endsWith("/chat/completions")
      ? formatted
      : `${formatted}/chat/completions`;
  } catch {
    return formatted;
  }
}

export function modelsUrlFor(chatCompletionsUrl: string) {
  return `${chatCompletionsUrl.replace(/\/chat\/completions$/, "")}/models`;
}
