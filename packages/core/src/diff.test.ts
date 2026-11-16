import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { applyDiff, diffPrompts, tokenize } from "./diff.ts";

const changes = (before: string, after: string) =>
  diffPrompts(before, after).segments.filter((s) => s.kind === "change");

describe("tokenize", () => {
  test("splits words, whitespace and punctuation, and joins back losslessly", () => {
    const text = "Write a 3-line poem, don't rhyme.\n\nThanks!";
    assert.deepEqual(tokenize("don't stop, now."), ["don't", " ", "stop", ",", " ", "now", "."]);
    assert.equal(tokenize(text).join(""), text);
  });
});

describe("diffPrompts", () => {
  test("identical texts have no changes", () => {
    const diff = diffPrompts("same text", "same text");
    assert.equal(diff.changeCount, 0);
    assert.equal(diff.similarity, 1);
  });

  test("a replaced word is one change", () => {
    assert.deepEqual(changes("write a short email", "write a friendly email"), [
      { kind: "change", index: 0, removed: "short", added: "friendly" },
    ]);
  });

  test("insertions and deletions", () => {
    assert.deepEqual(changes("write an email", "write a launch email for customers"), [
      { kind: "change", index: 0, removed: "an", added: "a launch" },
      { kind: "change", index: 1, removed: "", added: " for customers" },
    ]);
    assert.deepEqual(changes("please write an email now", "write an email"), [
      { kind: "change", index: 0, removed: "please ", added: "" },
      { kind: "change", index: 1, removed: " now", added: "" },
    ]);
  });

  test("neighbouring changes separated only by spaces merge into one", () => {
    assert.deepEqual(changes("the quick brown fox", "a slow red fox"), [
      { kind: "change", index: 0, removed: "the quick brown", added: "a slow red" },
    ]);
  });

  test("similarity reflects how much of the result is unchanged", () => {
    assert.ok(diffPrompts("write an email to my team", "write an email to my team today").similarity > 0.8);
    assert.ok(diffPrompts("hello", "completely different words here").similarity < 0.3);
  });

  test("very large inputs fall back to one wholesale change", () => {
    const big = "word ".repeat(7000);
    const diff = diffPrompts(big, `${big}extra`);
    assert.equal(diff.wholesale, true);
    assert.equal(diff.changeCount, 1);
  });
});

describe("applyDiff", () => {
  const before = "write a short email to my team about the launch";
  const after = "Write a friendly email to my product team about Monday's launch, under 150 words.";
  const diff = diffPrompts(before, after);

  test("accepting everything gives the result; rejecting everything gives the draft", () => {
    assert.equal(applyDiff(diff), after);
    assert.equal(
      applyDiff(diff, diff.segments.flatMap((s) => (s.kind === "change" ? [s.index] : []))),
      before,
    );
  });

  test("rejecting one change keeps the draft's wording only there", () => {
    const short = diff.segments.find((s) => s.kind === "change" && s.removed === "short");
    assert.ok(short && short.kind === "change");
    const partial = applyDiff(diff, [short.index]);
    assert.match(partial, /a short email/);
    assert.match(partial, /under 150 words/);
  });

  test("round-trips on random edits", () => {
    const words = ["alpha", "beta", "gamma", "delta", "eps", ",", "\n", "zeta"];
    let seed = 7;
    const rand = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const sentence = () =>
      Array.from({ length: 30 }, () => words[Math.floor(rand() * words.length)]).join(" ");
    for (let i = 0; i < 50; i++) {
      const a = sentence();
      const b = sentence();
      const d = diffPrompts(a, b);
      assert.equal(applyDiff(d), b);
      assert.equal(applyDiff(d, d.segments.flatMap((s) => (s.kind === "change" ? [s.index] : []))), a);
    }
  });
});
