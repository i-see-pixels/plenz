import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { modelsUrlFor, resolveChatCompletionsUrl } from "./endpoints.ts";

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
