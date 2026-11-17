import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  emptyLearning,
  hiddenChecks,
  normalizeLearning,
  parseLearningEvent,
  preferredMode,
  recordLearning,
  type Learning,
  type LearningEvent,
} from "./learning.ts";

const apply = (events: LearningEvent[], start: Learning = emptyLearning()) =>
  events.reduce(recordLearning, start);
const times = <T>(n: number, value: T) => Array.from({ length: n }, () => value);

describe("preferredMode", () => {
  test("none until a mode has been accepted a few times", () => {
    assert.equal(preferredMode(emptyLearning()), null);
    const twice = apply(times(2, { type: "refine", mode: "tighten", accepted: true } as const));
    assert.equal(preferredMode(twice), null);
  });

  test("the mode accepted most, if it's kept more often than closed", () => {
    const learning = apply([
      ...times(4, { type: "refine", mode: "tighten", accepted: true } as const),
      ...times(3, { type: "refine", mode: "improve", accepted: true } as const),
    ]);
    assert.equal(preferredMode(learning), "tighten");

    const thenClosed = apply(
      times(5, { type: "refine", mode: "tighten", accepted: false } as const),
      learning,
    );
    assert.equal(preferredMode(thenClosed), "improve");
  });

  test("old habits fade: counts are halved past the cap", () => {
    const old = apply(times(40, { type: "refine", mode: "structure", accepted: true } as const));
    const now = apply(times(25, { type: "refine", mode: "structure", accepted: false } as const), old);
    const stats = now.modes.structure!;
    assert.ok(stats.accepted + stats.dismissed <= 41, JSON.stringify(stats));
    assert.equal(preferredMode(now), null);
  });
});

describe("hiddenChecks", () => {
  const sent = (ignored: string[], fixed: string[] = []) =>
    ({ type: "sent", ignored, fixed }) as const;

  test("a check ignored on many sent drafts is hidden", () => {
    const learning = apply(times(5, sent(["no_audience"])));
    assert.deepEqual([...hiddenChecks(learning)], ["no_audience"]);
  });

  test("not while it is still being acted on sometimes", () => {
    const learning = apply([...times(5, sent(["no_format"])), ...times(2, sent([], ["no_format"]))]);
    assert.deepEqual([...hiddenChecks(learning)], []);
    assert.deepEqual([...hiddenChecks(apply(times(4, sent(["no_format"]))))], []);
  });
});

describe("storage and messages", () => {
  test("normalizeLearning drops junk", () => {
    assert.deepEqual(normalizeLearning("x"), emptyLearning());
    assert.deepEqual(
      normalizeLearning({
        modes: { improve: { accepted: 2.7, dismissed: -1 }, bogus: { accepted: 1 } },
        checks: { no_format: { fixed: 1, ignored: "3" }, "Bad Id": { fixed: 1, ignored: 1 } },
      }),
      { modes: { improve: { accepted: 2, dismissed: 0 } }, checks: { no_format: { fixed: 1, ignored: 0 } } },
    );
  });

  test("parseLearningEvent accepts only well-formed events", () => {
    assert.deepEqual(parseLearningEvent({ type: "refine", mode: "ask", accepted: false }), {
      type: "refine",
      mode: "ask",
      accepted: false,
    });
    assert.deepEqual(
      parseLearningEvent({ type: "sent", fixed: ["vague", "vague", 3], ignored: ["no_goal", "../x"] }),
      { type: "sent", fixed: ["vague"], ignored: ["no_goal"] },
    );
    for (const bad of [null, { type: "refine", mode: "compose", accepted: true }, { type: "sent", fixed: [] }, {
      type: "other",
    }]) {
      assert.equal(parseLearningEvent(bad), null, JSON.stringify(bad));
    }
  });
});
