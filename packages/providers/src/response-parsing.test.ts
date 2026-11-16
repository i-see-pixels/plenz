import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  extractJsonObject,
  modelsUrlFor,
  normalizeSuggestions,
  parseSuggestionsText,
  recoverTruncatedSuggestions,
  resolveChatCompletionsUrl,
} from "./response-parsing.ts";

const item = (suggested: string, extra: Record<string, unknown> = {}) => ({
  type: "rewrite",
  suggested,
  rationale: "clearer",
  confidence: 0.8,
  ...extra,
});

describe("extractJsonObject", () => {
  test("reads plain JSON, a ```json fence, or JSON wrapped in prose", () => {
    const json = JSON.stringify({ suggestions: [] });
    assert.deepEqual(extractJsonObject(json), { suggestions: [] });
    assert.deepEqual(extractJsonObject("```json\n" + json + "\n```"), { suggestions: [] });
    assert.deepEqual(extractJsonObject(`Here you go: ${json} Hope it helps`), {
      suggestions: [],
    });
  });

  test("returns null when there is no object", () => {
    assert.equal(extractJsonObject("no json here"), null);
    assert.equal(extractJsonObject("[1, 2]"), null);
  });
});

describe("normalizeSuggestions", () => {
  test("fills defaults, accepts alternate keys and clamps confidence", () => {
    assert.deepEqual(
      normalizeSuggestions([
        { suggested_text: "A", original_text: "a", confidence: 3, type: "nope" },
      ]),
      [
        {
          id: "suggestion-1",
          type: "clarify",
          original: "a",
          suggested: "A",
          rationale: "Improves prompt clarity.",
          confidence: 1,
        },
      ],
    );
  });

  test("drops items without suggested text and non-arrays", () => {
    assert.deepEqual(normalizeSuggestions([{ rationale: "x" }, null, "str"]), []);
    assert.deepEqual(normalizeSuggestions({ suggested: "x" }), []);
  });
});

describe("recoverTruncatedSuggestions", () => {
  test("keeps the objects completed before the cut", () => {
    const complete = [item("one"), item('two "quoted" }')].map((s) => JSON.stringify(s));
    const cut = `{"suggestions": [${complete.join(", ")}, {"type": "rew`;
    const recovered = recoverTruncatedSuggestions(cut);
    assert.equal(recovered.length, 2);
    assert.equal((recovered[1] as { suggested: string }).suggested, 'two "quoted" }');
  });
});

describe("parseSuggestionsText", () => {
  test("parses a full reply", () => {
    const text = JSON.stringify({ suggestions: [item("Better prompt")] });
    assert.equal(parseSuggestionsText(text, "X")[0].suggested, "Better prompt");
  });

  test("falls back to truncated recovery", () => {
    const text = `{"suggestions": [${JSON.stringify(item("Kept"))}, {"type": "rewr`;
    assert.equal(parseSuggestionsText(text, "X")[0].suggested, "Kept");
  });

  test("empty text gives nothing; unusable text throws with the provider name", () => {
    assert.deepEqual(parseSuggestionsText("   ", "X"), []);
    assert.throws(() => parseSuggestionsText("sorry, I can't", "Groq"), /from Groq/);
  });
});

describe("endpoints", () => {
  test("base URLs gain /chat/completions; full endpoints are kept", () => {
    assert.equal(
      resolveChatCompletionsUrl("https://api.deepseek.com/"),
      "https://api.deepseek.com/chat/completions",
    );
    assert.equal(
      resolveChatCompletionsUrl("http://localhost:11434/v1/chat/completions"),
      "http://localhost:11434/v1/chat/completions",
    );
  });

  test("the models URL sits beside chat completions", () => {
    assert.equal(
      modelsUrlFor("https://api.groq.com/openai/v1/chat/completions"),
      "https://api.groq.com/openai/v1/models",
    );
  });
});
