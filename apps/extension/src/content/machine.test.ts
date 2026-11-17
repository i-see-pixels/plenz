import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createContentModel,
  isPanelOpen,
  keyToEvent,
  recommendedMode,
  transition,
  view,
  type ContentEffect,
  type ContentEvent,
  type ContentModel,
  type LintSummary,
} from "./machine.ts";

const PROMPT = "write me an email to my landlord";

function run(model: ContentModel, ...events: ContentEvent[]) {
  const effects: ContentEffect[] = [];
  for (const event of events) {
    const result = transition(model, event);
    model = result.model;
    effects.push(...result.effects);
  }
  return { model, effects };
}

const typed = (autoRefine = false, text = PROMPT) =>
  run(
    createContentModel(true, 500, autoRefine),
    { type: "INPUT_ATTACHED" },
    { type: "TEXT_CHANGED", text },
  ).model;

const picking = () => run(typed(), { type: "BADGE_CLICKED" }).model;
const streaming = (mode: "improve" | "tighten" = "improve") =>
  run(picking(), { type: "MODE_CHOSEN", mode }).model;
const result = () =>
  run(streaming(), { type: "REFINE_DONE", requestId: 1, text: "Better prompt" }).model;

const LINT: LintSummary = {
  assessed: true,
  score: 55,
  findings: [
    { id: "no_goal", label: "No goal or context", hint: "a" },
    { id: "no_audience", label: "No audience or tone", hint: "b" },
    { id: "no_length", label: "No length", hint: "c" },
    { id: "no_constraints", label: "No constraints", hint: "d" },
  ],
};

describe("typing and the lint badge", () => {
  test("ignores typing until an input is attached", () => {
    const { model, effects } = run(createContentModel(), { type: "TEXT_CHANGED", text: PROMPT });
    assert.equal(model.state.kind, "detached");
    assert.deepEqual(effects, []);
  });

  test("by default typing only tracks the draft; nothing is sent", () => {
    const model = typed();
    assert.equal(model.state.kind, "idle");
    assert.equal(model.text, PROMPT);
  });

  test("the idle badge shows the score and the top three chips", () => {
    const badge = view(typed(), LINT).badge;
    assert.deepEqual(badge, {
      kind: "lint",
      score: 55,
      findings: [
        { label: "No goal or context", hint: "a" },
        { label: "No audience or tone", hint: "b" },
        { label: "No length", hint: "c" },
      ],
      canUndo: false,
    });
  });

  test("an unscored draft still gets a refine badge; short drafts get a quiet one", () => {
    assert.deepEqual(view(typed(), { assessed: false, score: 100, findings: [] }).badge, {
      kind: "lint",
      score: null,
      findings: [],
      canUndo: false,
    });
    assert.deepEqual(view(typed(false, "hi"), LINT).badge, { kind: "idle" });
    assert.deepEqual(view(typed(false, ""), LINT).badge, { kind: "idle" });
  });

  test("disabling suggestions hides everything and stops pending work", () => {
    const { model, effects } = run(streaming(), {
      type: "PREFERENCES_CHANGED",
      enabled: false,
      debounceMs: 500,
      autoRefine: false,
    });
    assert.equal(model.state.kind, "idle");
    assert.deepEqual(effects, [{ type: "cancelRefine" }]);
    assert.equal(view(model, LINT).badge.kind, "hidden");
  });
});

describe("mode picker and streaming", () => {
  test("clicking the badge opens the picker without calling the provider", () => {
    const { model, effects } = run(typed(), { type: "BADGE_CLICKED" });
    assert.equal(model.state.kind, "picking");
    assert.deepEqual(effects, []);
    assert.equal(view(model, LINT).panel?.kind, "picking");
    assert.equal(view(model, LINT).badge.kind, "hidden");
  });

  test("the picker recommends Tighten for long or wall-of-text drafts", () => {
    assert.equal(recommendedMode(LINT), "improve");
    assert.equal(
      recommendedMode({ ...LINT, findings: [{ id: "wall_of_text", label: "", hint: "" }] }),
      "tighten",
    );
  });

  test("otherwise the mode the user keeps accepting is suggested", () => {
    assert.equal(recommendedMode(LINT, "structure"), "structure");
    assert.equal(
      recommendedMode({ ...LINT, findings: [{ id: "too_long", label: "", hint: "" }] }, "structure"),
      "tighten",
    );
    const panel = view(picking(), LINT, "ask").panel;
    assert.equal(panel?.kind === "picking" && panel.recommended, "ask");
  });

  test("choosing a mode streams it into the panel", () => {
    const { model, effects } = run(picking(), { type: "MODE_CHOSEN", mode: "tighten" });
    assert.deepEqual(effects, [
      { type: "startRefine", requestId: 1, step: "tighten", text: PROMPT, answers: undefined },
    ]);
    const streamed = run(
      model,
      { type: "REFINE_DELTA", requestId: 1, text: "Short " },
      { type: "REFINE_DELTA", requestId: 1, text: "prompt" },
    ).model;
    assert.deepEqual(view(streamed, null).panel, {
      kind: "streaming",
      step: "tighten",
      output: "Short prompt",
    });
  });

  test("done replaces the streamed text with the cleaned final text", () => {
    const model = run(
      streaming(),
      { type: "REFINE_DELTA", requestId: 1, text: "Here's the prompt:\nBetter" },
      { type: "REFINE_DONE", requestId: 1, text: "Better" },
    ).model;
    assert.deepEqual(view(model, null).panel, {
      kind: "result",
      step: "improve",
      original: PROMPT,
      output: "Better",
      rejected: [],
    });
  });

  test("Ctrl/Cmd+Shift+Enter runs Improve straight away", () => {
    const { model, effects } = run(typed(), { type: "REFINE_REQUESTED" });
    assert.equal(model.state.kind, "streaming");
    assert.equal(effects[0].type, "startRefine");
    assert.equal(isPanelOpen(model.state), true);
  });

  test("switching mode mid-stream cancels the old request; its replies are dropped", () => {
    const { model, effects } = run(streaming(), { type: "MODE_CHOSEN", mode: "structure" });
    assert.deepEqual(effects.map((e) => e.type), ["cancelRefine", "startRefine"]);
    const late = run(model, { type: "REFINE_DONE", requestId: 1, text: "old" }).model;
    assert.equal(late.state.kind, "streaming");
  });

  test("a failure shows in the panel and a mode can be retried", () => {
    const failed = run(streaming(), {
      type: "REFINE_FAILED",
      requestId: 1,
      message: "rate limited",
    }).model;
    assert.deepEqual(view(failed, null).panel, {
      kind: "failed",
      step: "improve",
      message: "rate limited",
    });
    assert.equal(run(failed, { type: "MODE_CHOSEN", mode: "improve" }).model.state.kind, "streaming");
  });

  test("short drafts can't be refined, but the badge still offers context cards", () => {
    assert.deepEqual(run(typed(false, "hi"), { type: "REFINE_REQUESTED" }).effects, []);
    const picker = run(typed(false, "hi"), { type: "BADGE_CLICKED" }).model;
    assert.equal(picker.state.kind, "picking");
    assert.deepEqual(view(picker, LINT).panel, {
      kind: "picking",
      recommended: "improve",
      findings: [],
      canRefine: false,
    });
    assert.deepEqual(run(picker, { type: "MODE_CHOSEN", mode: "improve" }).effects, []);
    assert.deepEqual(run(picker, { type: "CARD_CHOSEN", text: "I'm a designer." }).effects, [
      { type: "applyText", text: "I'm a designer.\n\nhi" },
    ]);
  });
});

describe("Ask me", () => {
  const asking = () => run(picking(), { type: "MODE_CHOSEN", mode: "ask" }).model;
  const answering = () =>
    run(asking(), {
      type: "QUESTIONS_READY",
      requestId: 1,
      questions: ["Who is it for?", "How long?"],
    }).model;

  test("asks for questions, then shows them with empty answers", () => {
    assert.deepEqual(view(asking(), null).panel, { kind: "asking" });
    assert.deepEqual(view(answering(), null).panel, {
      kind: "answering",
      questions: ["Who is it for?", "How long?"],
      answers: ["", ""],
    });
  });

  test("submitting composes a prompt from the answers", () => {
    const { model, effects } = run(
      answering(),
      { type: "ANSWER_CHANGED", index: 0, value: "my landlord" },
      { type: "ANSWERS_SUBMITTED" },
    );
    assert.equal(model.state.kind, "streaming");
    assert.deepEqual(effects, [
      {
        type: "startRefine",
        requestId: 2,
        step: "compose",
        text: PROMPT,
        answers: [
          { question: "Who is it for?", answer: "my landlord" },
          { question: "How long?", answer: "" },
        ],
      },
    ]);
  });

  test("answers for questions that don't exist are ignored", () => {
    const model = answering();
    assert.equal(run(model, { type: "ANSWER_CHANGED", index: 5, value: "x" }).model, model);
  });

  test("a failed question request shows in the panel", () => {
    const failed = run(asking(), { type: "REFINE_FAILED", requestId: 1, message: "no" }).model;
    assert.deepEqual(view(failed, null).panel, { kind: "failed", step: "ask", message: "no" });
  });
});

describe("accepting and dismissing", () => {
  test("accept writes the result, ignores our own input event, then idles on the new text", () => {
    const accepted = run(result(), { type: "ACCEPT" });
    assert.deepEqual(accepted.effects, [
      { type: "recordRefine", mode: "improve", accepted: true },
      { type: "applyResult", original: PROMPT, output: "Better prompt", rejected: [] },
    ]);
    const { model, effects } = run(
      accepted.model,
      { type: "TEXT_CHANGED", text: "Better prompt" },
      { type: "APPLIED", text: "Better prompt" },
    );
    assert.equal(model.state.kind, "idle");
    assert.equal(model.text, "Better prompt");
    assert.deepEqual(effects, []);
  });

  test("dismiss closes the panel and cancels a running refine", () => {
    const { model, effects } = run(streaming(), { type: "DISMISS" });
    assert.equal(model.state.kind, "idle");
    assert.deepEqual(effects, [{ type: "cancelRefine" }]);
  });

  test("editing the draft closes the panel and cancels the refine", () => {
    const { model, effects } = run(streaming(), { type: "TEXT_CHANGED", text: `${PROMPT}!` });
    assert.equal(model.state.kind, "idle");
    assert.deepEqual(effects, [{ type: "cancelRefine" }]);
  });

  test("detaching cancels the refine", () => {
    const { model, effects } = run(streaming(), { type: "INPUT_DETACHED" });
    assert.equal(model.state.kind, "detached");
    assert.deepEqual(effects, [{ type: "cancelRefine" }]);
  });
});

describe("auto-refine (opt-in)", () => {
  test("typing starts a debounce; the pause runs Improve behind the badge", () => {
    const first = run(createContentModel(true, 500, true), { type: "INPUT_ATTACHED" }, {
      type: "TEXT_CHANGED",
      text: PROMPT,
    });
    assert.deepEqual(first.effects, [{ type: "startDebounce", ms: 500 }]);

    const { model, effects } = run(first.model, { type: "DEBOUNCE_ELAPSED" });
    assert.deepEqual(effects, [
      { type: "startRefine", requestId: 1, step: "improve", text: PROMPT, answers: undefined },
    ]);
    assert.deepEqual(view(model, LINT), { badge: { kind: "saving" }, panel: null });
  });

  test("a finished background refine waits behind a ready badge; clicking shows it", () => {
    const done = run(
      typed(true),
      { type: "DEBOUNCE_ELAPSED" },
      { type: "REFINE_DONE", requestId: 1, text: "Better" },
    ).model;
    assert.deepEqual(view(done, null).badge, { kind: "ready" });
    const shown = run(done, { type: "BADGE_CLICKED" }).model;
    assert.deepEqual(view(shown, null).panel, {
      kind: "result",
      step: "improve",
      original: PROMPT,
      output: "Better",
      rejected: [],
    });
  });

  test("typing again restarts the debounce", () => {
    const { effects } = run(typed(true), { type: "TEXT_CHANGED", text: `${PROMPT} today` });
    assert.deepEqual(effects, [{ type: "clearDebounce" }, { type: "startDebounce", ms: 500 }]);
  });

  test("a new debounce time applies to the next cycle", () => {
    const tuned = run(createContentModel(true, 500, true), { type: "INPUT_ATTACHED" }, {
      type: "PREFERENCES_CHANGED",
      enabled: true,
      debounceMs: 900,
      autoRefine: true,
    }).model;
    assert.deepEqual(run(tuned, { type: "TEXT_CHANGED", text: PROMPT }).effects, [
      { type: "startDebounce", ms: 900 },
    ]);
  });
});

describe("diff choices and undo", () => {
  const applied = () =>
    run(result(), { type: "ACCEPT" }, { type: "APPLIED", text: "Better prompt" }).model;

  test("toggling a change rejects it, toggling again takes it back", () => {
    const once = run(result(), { type: "CHANGE_TOGGLED", index: 2 }, { type: "CHANGE_TOGGLED", index: 0 })
      .model;
    assert.deepEqual(view(once, null).panel, {
      kind: "result",
      step: "improve",
      original: PROMPT,
      output: "Better prompt",
      rejected: [0, 2],
    });
    const back = run(once, { type: "CHANGE_TOGGLED", index: 2 }).model;
    assert.equal(back.state.kind === "result" && back.state.rejected.join(), "0");
    const reset = run(once, { type: "CHANGES_RESET" }).model;
    assert.equal(reset.state.kind === "result" && reset.state.rejected.length, 0);
  });

  test("accept passes the rejected changes to the driver", () => {
    const { effects } = run(result(), { type: "CHANGE_TOGGLED", index: 1 }, { type: "ACCEPT" });
    assert.deepEqual(effects, [
      { type: "recordRefine", mode: "improve", accepted: true },
      { type: "applyResult", original: PROMPT, output: "Better prompt", rejected: [1] },
    ]);
  });

  test("after a replace the badge offers undo, which restores the draft", () => {
    const model = applied();
    const badge = view(model, LINT).badge;
    assert.equal(badge.kind === "lint" && badge.canUndo, true);

    const { model: undoing, effects } = run(model, { type: "UNDO_REQUESTED" });
    assert.deepEqual(effects, [{ type: "applyText", text: PROMPT }]);
    const restored = run(
      undoing,
      { type: "TEXT_CHANGED", text: PROMPT },
      { type: "APPLIED", text: PROMPT },
    ).model;
    assert.equal(restored.text, PROMPT);
    assert.equal(restored.undo, null);
  });

  test("editing after a replace drops the undo", () => {
    const edited = run(applied(), { type: "TEXT_CHANGED", text: "Better prompt!" }).model;
    assert.equal(edited.undo, null);
    assert.deepEqual(run(edited, { type: "UNDO_REQUESTED" }).effects, []);
  });

  test("undo is ignored while a panel is open", () => {
    const open = run(applied(), { type: "BADGE_CLICKED" }).model;
    assert.deepEqual(run(open, { type: "UNDO_REQUESTED" }).effects, []);
  });
});

describe("keyToEvent", () => {
  const key = (
    k: string,
    extra: Partial<{ shiftKey: boolean; modKey: boolean; inInput: boolean }> = {},
  ) => ({ key: k, shiftKey: false, modKey: false, inInput: true, ...extra });
  const refineKey = key("Enter", { shiftKey: true, modKey: true });

  test("leaves every key alone when nothing is offered", () => {
    for (const k of ["Tab", "Escape", "ArrowUp", "Enter"]) {
      assert.equal(keyToEvent(typed().state, key(k)), null);
    }
  });

  test("Esc closes the panel from anywhere, including the panel's own inputs", () => {
    assert.deepEqual(keyToEvent(picking().state, key("Escape", { inInput: false })), {
      type: "DISMISS",
    });
  });

  test("Tab in the chat input accepts a finished result", () => {
    assert.deepEqual(keyToEvent(result().state, key("Tab")), { type: "ACCEPT" });
    assert.equal(keyToEvent(result().state, key("Tab", { inInput: false })), null);
    assert.equal(keyToEvent(result().state, key("Tab", { shiftKey: true })), null);
    assert.equal(keyToEvent(streaming().state, key("Tab")), null);
  });

  test("Ctrl/Cmd+Shift+Enter in the chat input refines; plain Enter and Shift+Enter are the page's", () => {
    assert.deepEqual(keyToEvent(typed().state, refineKey), { type: "REFINE_REQUESTED" });
    assert.equal(keyToEvent(typed().state, { ...refineKey, inInput: false }), null);
    assert.equal(keyToEvent(typed().state, key("Enter", { shiftKey: true })), null);
  });
});

describe("context cards", () => {
  const CARD = "I run a two-person bakery.";

  test("choosing a card in the picker writes it above the draft, with undo", () => {
    const { model: applying, effects } = run(picking(), { type: "CARD_CHOSEN", text: CARD });
    const withCardText = `${CARD}\n\n${PROMPT}`;
    assert.deepEqual(effects, [{ type: "applyText", text: withCardText }]);
    assert.equal(isPanelOpen(applying.state), false);

    const done = run(applying, { type: "APPLIED", text: withCardText }).model;
    assert.equal(done.state.kind, "idle");
    assert.deepEqual(done.undo, { previous: PROMPT, applied: withCardText });
  });

  test("a card already at the top just closes the picker", () => {
    const model = run(picking(), { type: "CARD_CHOSEN", text: PROMPT });
    assert.deepEqual(model.effects, []);
    assert.equal(model.model.state.kind, "idle");
  });

  test("ignored outside the picker", () => {
    for (const model of [typed(), streaming(), result()]) {
      assert.deepEqual(run(model, { type: "CARD_CHOSEN", text: CARD }).effects, []);
    }
  });
});

describe("slash command inserts", () => {
  test("replaces the draft while typing, with undo", () => {
    const start = typed(true, "/launch");
    assert.equal(start.state.kind, "idle"); // too short to refine
    const { model, effects } = run(start, { type: "SLASH_INSERT", text: "Write a launch email" });
    assert.deepEqual(effects, [{ type: "applyText", text: "Write a launch email" }]);
    const done = run(model, { type: "APPLIED", text: "Write a launch email" }).model;
    assert.deepEqual(done.undo, { previous: "/launch", applied: "Write a launch email" });
  });

  test("cancels a pending auto-refine", () => {
    const debouncing = typed(true);
    assert.equal(debouncing.state.kind, "debouncing");
    assert.deepEqual(run(debouncing, { type: "SLASH_INSERT", text: "Other" }).effects, [
      { type: "clearDebounce" },
      { type: "applyText", text: "Other" },
    ]);
  });

  test("ignored while the panel is open", () => {
    assert.deepEqual(run(picking(), { type: "SLASH_INSERT", text: "Other" }).effects, []);
  });
});

describe("learning outcomes", () => {
  const records = (effects: ContentEffect[]) => effects.filter((e) => e.type === "recordRefine");

  test("closing or replacing a result with another mode counts as set aside", () => {
    assert.deepEqual(records(run(result(), { type: "DISMISS" }).effects), [
      { type: "recordRefine", mode: "improve", accepted: false },
    ]);
    assert.deepEqual(records(run(result(), { type: "MODE_CHOSEN", mode: "tighten" }).effects), [
      { type: "recordRefine", mode: "improve", accepted: false },
    ]);
    assert.deepEqual(records(run(result(), { type: "REFINE_REQUESTED" }).effects), [
      { type: "recordRefine", mode: "improve", accepted: false },
    ]);
  });

  test("Ask me results are recorded as the ask mode", () => {
    const answering = run(picking(), { type: "MODE_CHOSEN", mode: "ask" }, {
      type: "QUESTIONS_READY",
      requestId: 1,
      questions: ["Who is it for?"],
    }).model;
    const composed = run(answering, { type: "ANSWERS_SUBMITTED" }, {
      type: "REFINE_DONE",
      requestId: 2,
      text: "Composed",
    }).model;
    assert.deepEqual(records(run(composed, { type: "ACCEPT" }).effects), [
      { type: "recordRefine", mode: "ask", accepted: true },
    ]);
  });

  test("nothing is recorded for a stopped stream, the picker, or a background result", () => {
    assert.deepEqual(records(run(streaming(), { type: "DISMISS" }).effects), []);
    assert.deepEqual(records(run(picking(), { type: "DISMISS" }).effects), []);
    const hidden = run(typed(true), { type: "DEBOUNCE_ELAPSED" }, {
      type: "REFINE_DONE",
      requestId: 1,
      text: "Better",
    }).model;
    assert.deepEqual(records(run(hidden, { type: "TEXT_CHANGED", text: PROMPT + "!" }).effects), []);
  });
});

describe("failure details", () => {
  test("the panel gets the provider detail and whether settings can fix it", () => {
    const failed = run(streaming(), {
      type: "REFINE_FAILED",
      requestId: 1,
      message: "Your provider rejected the API key.",
      detail: "401: Incorrect API key",
      fixInSettings: true,
    }).model;
    assert.deepEqual(view(failed, null).panel, {
      kind: "failed",
      step: "improve",
      message: "Your provider rejected the API key.",
      detail: "401: Incorrect API key",
      fixInSettings: true,
    });
  });
});
