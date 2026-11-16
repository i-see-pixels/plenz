import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Suggestion } from "@plenz/types";
import {
  createContentModel,
  keyToEvent,
  transition,
  view,
  type ContentEvent,
  type ContentModel,
} from "./machine.ts";

const PROMPT = "write me an email to my landlord";

function suggestion(id: string): Suggestion {
  return {
    id,
    type: "rewrite",
    original: "",
    suggested: `suggested ${id}`,
    rationale: "because",
    confidence: 0.9,
  };
}

const SUGGESTIONS = [suggestion("a"), suggestion("b"), suggestion("c")];

function run(model: ContentModel, ...events: ContentEvent[]) {
  const effects = [];
  for (const event of events) {
    const result = transition(model, event);
    model = result.model;
    effects.push(...result.effects);
  }
  return { model, effects };
}

function attached() {
  return run(createContentModel(), { type: "INPUT_ATTACHED" }).model;
}

function analyzing() {
  return run(
    attached(),
    { type: "TEXT_CHANGED", text: PROMPT },
    { type: "DEBOUNCE_ELAPSED" },
  ).model;
}

function ready() {
  return run(analyzing(), {
    type: "ANALYSIS_SUCCEEDED",
    requestId: 1,
    suggestions: SUGGESTIONS,
  }).model;
}

function open() {
  return run(ready(), { type: "OPEN_REQUESTED" }).model;
}

describe("content machine: analysis flow", () => {
  test("starts detached and ignores typing until an input is attached", () => {
    const { model, effects } = run(createContentModel(), {
      type: "TEXT_CHANGED",
      text: PROMPT,
    });
    assert.equal(model.state.kind, "detached");
    assert.deepEqual(effects, []);
  });

  test("typing a long enough prompt starts the debounce", () => {
    const { model, effects } = run(attached(), {
      type: "TEXT_CHANGED",
      text: PROMPT,
    });
    assert.deepEqual(model.state, { kind: "debouncing", text: PROMPT });
    assert.deepEqual(effects, [{ type: "startDebounce", ms: 500 }]);
  });

  test("short prompts stay idle", () => {
    const { model, effects } = run(attached(), {
      type: "TEXT_CHANGED",
      text: "hi there",
    });
    assert.equal(model.state.kind, "idle");
    assert.deepEqual(effects, []);
  });

  test("typing again restarts the debounce", () => {
    const first = run(attached(), { type: "TEXT_CHANGED", text: PROMPT }).model;
    const { model, effects } = run(first, {
      type: "TEXT_CHANGED",
      text: `${PROMPT} today`,
    });
    assert.equal(model.state.kind, "debouncing");
    assert.deepEqual(effects, [
      { type: "clearDebounce" },
      { type: "startDebounce", ms: 500 },
    ]);
  });

  test("debounce elapsing requests analysis with a fresh request id", () => {
    const debouncing = run(attached(), {
      type: "TEXT_CHANGED",
      text: PROMPT,
    }).model;
    const { model, effects } = run(debouncing, { type: "DEBOUNCE_ELAPSED" });
    assert.deepEqual(model.state, {
      kind: "analyzing",
      text: PROMPT,
      requestId: 1,
    });
    assert.deepEqual(effects, [
      { type: "requestAnalysis", text: PROMPT, requestId: 1 },
    ]);
  });

  test("typing while analyzing cancels the in-flight request", () => {
    const { model, effects } = run(analyzing(), {
      type: "TEXT_CHANGED",
      text: `${PROMPT}!`,
    });
    assert.equal(model.state.kind, "debouncing");
    assert.deepEqual(effects, [
      { type: "cancelAnalysis" },
      { type: "startDebounce", ms: 500 },
    ]);
  });

  test("a stale response is dropped", () => {
    const restarted = run(
      analyzing(),
      { type: "TEXT_CHANGED", text: `${PROMPT}!` },
      { type: "DEBOUNCE_ELAPSED" },
    ).model;
    const { model } = run(restarted, {
      type: "ANALYSIS_SUCCEEDED",
      requestId: 1,
      suggestions: SUGGESTIONS,
    });
    assert.deepEqual(model.state, {
      kind: "analyzing",
      text: `${PROMPT}!`,
      requestId: 2,
    });
  });

  test("success with suggestions shows the badge, not the popover", () => {
    const state = ready().state;
    assert.equal(state.kind, "ready");
    const v = view(state);
    assert.deepEqual(v.badge, { kind: "count", count: 3 });
    assert.equal(v.overlay, null);
  });

  test("success with no suggestions returns to idle", () => {
    const { model } = run(analyzing(), {
      type: "ANALYSIS_SUCCEEDED",
      requestId: 1,
      suggestions: [],
    });
    assert.equal(model.state.kind, "idle");
  });

  test("failure shows the error badge", () => {
    const { model } = run(analyzing(), {
      type: "ANALYSIS_FAILED",
      requestId: 1,
      message: "rate limited",
    });
    assert.deepEqual(view(model.state).badge, {
      kind: "error",
      message: "rate limited",
    });
  });
});

describe("content machine: popover", () => {
  test("opening starts at the first suggestion and hides the badge", () => {
    const state = open().state;
    assert.equal(state.kind, "open");
    const v = view(state);
    assert.equal(v.badge.kind, "hidden");
    assert.equal(v.overlay?.activeIndex, 0);
  });

  test("navigation wraps in both directions", () => {
    const up = run(open(), { type: "NAVIGATE", direction: "up" }).model;
    assert.equal(view(up.state).overlay?.activeIndex, 2);
    const down = run(up, { type: "NAVIGATE", direction: "down" }).model;
    assert.equal(view(down.state).overlay?.activeIndex, 0);
  });

  test("accept applies the active suggestion, ignores our own input, then idles", () => {
    const moved = run(open(), { type: "NAVIGATE", direction: "down" }).model;
    const accepted = run(moved, { type: "ACCEPT" });
    assert.equal(accepted.model.state.kind, "applying");
    assert.deepEqual(accepted.effects, [
      { type: "applyText", text: "suggested b" },
    ]);

    const { model, effects } = run(
      accepted.model,
      { type: "TEXT_CHANGED", text: "suggested b" },
      { type: "APPLIED" },
    );
    assert.equal(model.state.kind, "idle");
    assert.deepEqual(effects, []);
  });

  test("clicking a suggestion applies that one", () => {
    const { effects } = run(open(), { type: "SELECT", index: 2 });
    assert.deepEqual(effects, [{ type: "applyText", text: "suggested c" }]);
  });

  test("dismiss returns to the badge with suggestions kept", () => {
    const { model } = run(open(), { type: "DISMISS" });
    assert.equal(model.state.kind, "ready");
    assert.deepEqual(view(model.state).badge, { kind: "count", count: 3 });
  });

  test("typing while open closes it and starts a new analysis cycle", () => {
    const { model } = run(open(), { type: "TEXT_CHANGED", text: `${PROMPT}.` });
    assert.equal(model.state.kind, "debouncing");
    assert.equal(view(model.state).overlay, null);
  });

  test("open/accept events do nothing outside their states", () => {
    for (const event of [
      { type: "OPEN_REQUESTED" },
      { type: "ACCEPT" },
      { type: "DISMISS" },
      { type: "NAVIGATE", direction: "down" },
    ] as ContentEvent[]) {
      const before = attached();
      assert.deepEqual(run(before, event), { model: before, effects: [] });
    }
  });
});

describe("content machine: lifecycle and preferences", () => {
  test("detaching while analyzing cancels the request", () => {
    const { model, effects } = run(analyzing(), { type: "INPUT_DETACHED" });
    assert.equal(model.state.kind, "detached");
    assert.deepEqual(effects, [{ type: "cancelAnalysis" }]);
  });

  test("disabling suggestions cancels pending work and idles", () => {
    const debouncing = run(attached(), {
      type: "TEXT_CHANGED",
      text: PROMPT,
    }).model;
    const { model, effects } = run(debouncing, {
      type: "PREFERENCES_CHANGED",
      enabled: false,
      debounceMs: 500,
    });
    assert.equal(model.state.kind, "idle");
    assert.deepEqual(effects, [{ type: "clearDebounce" }]);

    const typed = run(model, { type: "TEXT_CHANGED", text: PROMPT });
    assert.equal(typed.model.state.kind, "idle");
  });

  test("new debounce time applies to the next cycle", () => {
    const tuned = run(attached(), {
      type: "PREFERENCES_CHANGED",
      enabled: true,
      debounceMs: 900,
    }).model;
    const { effects } = run(tuned, { type: "TEXT_CHANGED", text: PROMPT });
    assert.deepEqual(effects, [{ type: "startDebounce", ms: 900 }]);
  });
});

describe("keyToEvent", () => {
  const key = (k: string, extra: Partial<{ shiftKey: boolean; inInput: boolean }> = {}) => ({
    key: k,
    shiftKey: false,
    inInput: true,
    ...extra,
  });

  test("leaves every key alone when nothing is offered", () => {
    for (const k of ["Tab", "Escape", "ArrowUp", "ArrowDown"]) {
      assert.equal(keyToEvent(attached().state, key(k)), null);
    }
  });

  test("Tab in the input opens the popover when suggestions are ready", () => {
    assert.deepEqual(keyToEvent(ready().state, key("Tab")), {
      type: "OPEN_REQUESTED",
    });
  });

  test("arrows, Shift+Tab and Tab outside the input pass through when closed", () => {
    const state = ready().state;
    assert.equal(keyToEvent(state, key("ArrowDown")), null);
    assert.equal(keyToEvent(state, key("Tab", { shiftKey: true })), null);
    assert.equal(keyToEvent(state, key("Tab", { inInput: false })), null);
  });

  test("the open popover owns Tab, Esc and the arrows", () => {
    const state = open().state;
    assert.deepEqual(keyToEvent(state, key("Tab")), { type: "ACCEPT" });
    assert.deepEqual(keyToEvent(state, key("Escape")), { type: "DISMISS" });
    assert.deepEqual(keyToEvent(state, key("ArrowUp")), {
      type: "NAVIGATE",
      direction: "up",
    });
    assert.equal(keyToEvent(state, key("a")), null);
  });
});
