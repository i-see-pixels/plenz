import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { lintPrompt } from "./lint.ts";

const ids = (text: string) => lintPrompt(text).findings.map((f) => f.id);

const COMPLETE =
  "You are a senior editor. Write a launch email for my team's new analytics feature, " +
  "for non-technical managers, in a friendly tone. Keep it under 150 words, as 3 short " +
  "paragraphs, and avoid jargon.";

describe("lintPrompt", () => {
  test("a complete prompt scores 100 with no findings", () => {
    const result = lintPrompt(COMPLETE);
    assert.deepEqual(result.findings, []);
    assert.equal(result.score, 100);
    assert.equal(result.assessed, true);
  });

  test("a bare request is flagged as short and missing the basics", () => {
    const found = ids("write an essay");
    assert.equal(found[0], "too_short");
    for (const id of ["no_goal", "no_audience", "no_length", "no_constraints"] as const) {
      assert.ok(found.includes(id), id);
    }
    // "essay" names the deliverable, so the format check passes.
    assert.ok(!found.includes("no_format"));
  });

  test("findings come most important first and lower the score", () => {
    const result = lintPrompt("Can you help me write a blog post about remote work culture please");
    const weights = result.findings.map((f) => f.weight);
    assert.deepEqual(weights, [...weights].sort((a, b) => b - a));
    assert.equal(result.score, 100 - weights.reduce((a, b) => a + b, 0));
  });

  test("vague words are flagged", () => {
    assert.ok(ids(`${COMPLETE} Add some stuff about pricing.`).includes("vague"));
  });

  test("a long single-paragraph paste is a wall of text", () => {
    const wall = `${COMPLETE} ${"lorem ipsum dolor sit amet ".repeat(40)}`;
    assert.ok(ids(wall).includes("wall_of_text"));
    assert.ok(!ids(wall.replace(". Keep", ".\n\nKeep")).includes("wall_of_text"));
  });

  test("very long drafts are flagged", () => {
    const long = `${COMPLETE}\n${"word ".repeat(900)}`;
    assert.ok(ids(long).includes("too_long"));
  });

  test("code and debug requests skip the writing-task checks", () => {
    const result = lintPrompt(
      "This throws on an empty list\n```js\nconst x = [].reduce((a, b) => a + b)\n```",
    );
    assert.equal(result.kind, "code");
    for (const id of ["no_format", "no_audience", "no_length", "no_constraints"]) {
      assert.ok(!result.findings.some((f) => f.id === id), id);
    }
    assert.equal(lintPrompt("fix this bug: TypeError in my component").kind, "code");
  });

  test("quick questions only get the context nudge", () => {
    const result = lintPrompt("Explain how React useEffect cleanup works");
    assert.equal(result.kind, "question");
    assert.deepEqual(result.findings.map((f) => f.id), ["no_goal"]);
    assert.equal(lintPrompt("what is RAG?").findings.some((f) => f.id === "too_short"), false);
  });

  test("named deliverables and specifics count", () => {
    assert.deepEqual(
      ids(
        "Give me 5 dinner ideas for a vegetarian family of four, each under 30 minutes, as a bulleted list",
      ),
      ["no_goal"],
    );
  });

  test("mostly non-Latin drafts are not assessed", () => {
    const result = lintPrompt("请帮我写一封关于新功能发布的电子邮件，给我的团队");
    assert.equal(result.assessed, false);
    assert.deepEqual(result.findings, []);
  });

  test("the score never goes below zero", () => {
    assert.equal(lintPrompt("do stuff").score >= 0, true);
  });
});
