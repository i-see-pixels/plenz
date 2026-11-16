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
  // These flows exercise auto-refine; on-demand refine has its own tests below.
  return run(createContentModel(true, 500, true), { type: "INPUT_ATTACHED" }).model;
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
    const model = ready();
    assert.equal(model.state.kind, "ready");
    const v = view(model, null);
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
    assert.deepEqual(view(model, null).badge, {
      kind: "error",
      message: "rate limited",
    });
  });
});

describe("content machine: popover", () => {
  test("opening starts at the first suggestion and hides the badge", () => {
    const model = open();
    assert.equal(model.state.kind, "open");
    const v = view(model, null);
    assert.equal(v.badge.kind, "hidden");
    assert.equal(v.overlay?.activeIndex, 0);
  });

  test("navigation wraps in both directions", () => {
    const up = run(open(), { type: "NAVIGATE", direction: "up" }).model;
    assert.equal(view(up, null).overlay?.activeIndex, 2);
    const down = run(up, { type: "NAVIGATE", direction: "down" }).model;
    assert.equal(view(down, null).overlay?.activeIndex, 0);
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
    assert.deepEqual(view(model, null).badge, { kind: "count", count: 3 });
  });

  test("typing while open closes it and starts a new analysis cycle", () => {
    const { model } = run(open(), { type: "TEXT_CHANGED", text: `${PROMPT}.` });
    assert.equal(model.state.kind, "debouncing");
    assert.equal(view(model, null).overlay, null);
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
      autoRefine: true,
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
      autoRefine: true,
    }).model;
    const { effects } = run(tuned, { type: "TEXT_CHANGED", text: PROMPT });
    assert.deepEqual(effects, [{ type: "startDebounce", ms: 900 }]);
  });
});

describe("keyToEvent", () => {
  const key = (
    k: string,
    extra: Partial<{ shiftKey: boolean; modKey: boolean; inInput: boolean }> = {},
  ) => ({
    key: k,
    shiftKey: false,
    modKey: false,
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

  test("Ctrl/Cmd+Shift+Enter in the input refines, but not while open or elsewhere", () => {
    const refineKey = key("Enter", { shiftKey: true, modKey: true });
    assert.deepEqual(keyToEvent(attached().state, refineKey), { type: "REFINE_REQUESTED" });
    assert.deepEqual(keyToEvent(ready().state, refineKey), { type: "REFINE_REQUESTED" });
    assert.equal(keyToEvent(open().state, refineKey), null);
    assert.equal(
      keyToEvent(attached().state, key("Enter", { shiftKey: true, modKey: true, inInput: false })),
      null,
    );
    // Plain and Shift+Enter belong to the page (send / newline).
    assert.equal(keyToEvent(attached().state, key("Enter")), null);
    assert.equal(keyToEvent(attached().state, key("Enter", { shiftKey: true })), null);
  });
});

describe("content machine: on-demand refine and lint", () => {
  const LINT = {
    assessed: true,
    score: 55,
    findings: [
      { label: "No goal or context", hint: "a" },
      { label: "No audience or tone", hint: "b" },
      { label: "No length", hint: "c" },
      { label: "No constraints", hint: "d" },
    ],
  };
  const manual = () =>
    run(createContentModel(), { type: "INPUT_ATTACHED" }, { type: "TEXT_CHANGED", text: PROMPT })
      .model;

  test("by default typing only tracks the draft; nothing is sent", () => {
    const { model, effects } = run(createContentModel(), { type: "INPUT_ATTACHED" }, {
      type: "TEXT_CHANGED",
      text: PROMPT,
    });
    assert.equal(model.state.kind, "idle");
    assert.equal(model.text, PROMPT);
    assert.deepEqual(effects, []);
  });

  test("the idle badge shows the lint score and the top three chips", () => {
    const badge = view(manual(), LINT).badge;
    assert.equal(badge.kind, "lint");
    if (badge.kind !== "lint") return;
    assert.equal(badge.score, 55);
    assert.deepEqual(
      badge.findings.map((f) => f.label),
      ["No goal or context", "No audience or tone", "No length"],
    );
  });

  test("a draft the linter can't score still shows a refine badge", () => {
    const badge = view(manual(), { assessed: false, score: 100, findings: [] }).badge;
    assert.deepEqual(badge, { kind: "lint", score: null, findings: [] });
  });

  test("no lint badge for short drafts or when suggestions are off", () => {
    const short = run(createContentModel(), { type: "INPUT_ATTACHED" }, {
      type: "TEXT_CHANGED",
      text: "hi",
    }).model;
    assert.equal(view(short, LINT).badge.kind, "hidden");
    const off = run(manual(), {
      type: "PREFERENCES_CHANGED",
      enabled: false,
      debounceMs: 500,
      autoRefine: false,
    }).model;
    assert.equal(view(off, LINT).badge.kind, "hidden");
  });

  test("a refine request analyzes the current draft straight away", () => {
    const { model, effects } = run(manual(), { type: "REFINE_REQUESTED" });
    assert.deepEqual(model.state, { kind: "analyzing", text: PROMPT, requestId: 1 });
    assert.deepEqual(effects, [{ type: "requestAnalysis", text: PROMPT, requestId: 1 }]);
  });

  test("refine skips a pending debounce in auto mode", () => {
    const debouncing = run(attached(), { type: "TEXT_CHANGED", text: PROMPT }).model;
    const { effects } = run(debouncing, { type: "REFINE_REQUESTED" });
    assert.deepEqual(effects, [
      { type: "clearDebounce" },
      { type: "requestAnalysis", text: PROMPT, requestId: 1 },
    ]);
  });

  test("refine is ignored for short drafts and while analyzing", () => {
    const short = run(createContentModel(), { type: "INPUT_ATTACHED" }, {
      type: "TEXT_CHANGED",
      text: "hi",
    }).model;
    assert.deepEqual(run(short, { type: "REFINE_REQUESTED" }).effects, []);
    const analyzing = run(manual(), { type: "REFINE_REQUESTED" }).model;
    assert.deepEqual(run(analyzing, { type: "REFINE_REQUESTED" }).effects, []);
  });

  test("the badge refines when idle or after an error, and opens when ready", () => {
    assert.equal(run(manual(), { type: "BADGE_CLICKED" }).model.state.kind, "analyzing");

    const failed = run(manual(), { type: "REFINE_REQUESTED" }, {
      type: "ANALYSIS_FAILED",
      requestId: 1,
      message: "timeout",
    }).model;
    assert.equal(run(failed, { type: "BADGE_CLICKED" }).model.state.kind, "analyzing");

    assert.equal(run(ready(), { type: "BADGE_CLICKED" }).model.state.kind, "open");
  });

  test("after applying, the applied text is the draft that gets linted", () => {
    const { model } = run(open(), { type: "ACCEPT" }, { type: "APPLIED" });
    assert.equal(model.state.kind, "idle");
    assert.equal(model.text, "suggested a");
  });
});

