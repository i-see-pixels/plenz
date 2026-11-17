import type { ClarifyingAnswer, RefineStep } from "@plenz/core";
import type { RefineMode } from "@plenz/types";
import { withCard } from "../shared/context-cards.ts";

// Pure state machine for the in-page flow. No DOM, timers or messaging here:
// `transition` returns the next model plus effects for the driver to run,
// and `view` projects a model onto what the badge and refine panel show.
//
// Typing is free: the driver lints the draft locally and the badge shows the
// result. A paid refine runs only when asked: the badge opens a mode picker,
// and Ctrl/Cmd+Shift+Enter runs Improve. With auto-refine on, Improve also
// runs in the background after a typing pause.

export const MIN_PROMPT_LENGTH = 10;

export type ContentState =
  | { kind: "detached" }
  | { kind: "idle" }
  /** Auto-refine is waiting for the user to pause. */
  | { kind: "debouncing" }
  /** The panel is open on its mode buttons. */
  | { kind: "picking" }
  /** `visible: false` is an auto-refine running behind the badge. */
  | {
      kind: "streaming";
      step: RefineStep;
      requestId: number;
      output: string;
      visible: boolean;
    }
  /** Ask me: waiting for the clarifying questions. */
  | { kind: "asking"; requestId: number }
  | { kind: "answering"; questions: string[]; answers: string[] }
  /** `rejected` lists diff changes the user chose to keep their own wording for. */
  | {
      kind: "result";
      step: RefineStep;
      output: string;
      visible: boolean;
      rejected: number[];
    }
  /** Writing into the chat input; `previous` is the draft being replaced. */
  | { kind: "applying"; previous: string; undoing: boolean }
  | { kind: "failed"; step: RefineStep; message: string; visible: boolean };

export type ContentModel = {
  state: ContentState;
  /** The current draft, tracked in every state so it can be linted. */
  text: string;
  enabled: boolean;
  /** Refine automatically after a typing pause (opt-in; each refine is a paid call). */
  autoRefine: boolean;
  debounceMs: number;
  lastRequestId: number;
  /** The last replace, while the input still holds exactly what was applied. */
  undo: { previous: string; applied: string } | null;
};

export type ContentEvent =
  | { type: "INPUT_ATTACHED" }
  | { type: "INPUT_DETACHED" }
  | {
      type: "PREFERENCES_CHANGED";
      enabled: boolean;
      debounceMs: number;
      autoRefine: boolean;
    }
  | { type: "TEXT_CHANGED"; text: string }
  | { type: "DEBOUNCE_ELAPSED" }
  | { type: "BADGE_CLICKED" }
  | { type: "MODE_CHOSEN"; mode: RefineMode }
  /** A context card picked in the panel; `text` is the card's text. */
  | { type: "CARD_CHOSEN"; text: string }
  /** A `/` command picked an item; `text` is the whole new draft. */
  | { type: "SLASH_INSERT"; text: string }
  /** Ctrl/Cmd+Shift+Enter: Improve straight away. */
  | { type: "REFINE_REQUESTED" }
  | { type: "REFINE_DELTA"; requestId: number; text: string }
  | { type: "REFINE_DONE"; requestId: number; text: string }
  | { type: "QUESTIONS_READY"; requestId: number; questions: string[] }
  | { type: "REFINE_FAILED"; requestId: number; message: string }
  | { type: "ANSWER_CHANGED"; index: number; value: string }
  | { type: "ANSWERS_SUBMITTED" }
  /** Click a change in the diff: keep the draft's wording there (or take it back). */
  | { type: "CHANGE_TOGGLED"; index: number }
  | { type: "CHANGES_RESET" }
  | { type: "ACCEPT" }
  | { type: "DISMISS" }
  /** The driver wrote `text` into the chat input. */
  | { type: "APPLIED"; text: string }
  | { type: "UNDO_REQUESTED" };

export type ContentEffect =
  | { type: "startDebounce"; ms: number }
  | { type: "clearDebounce" }
  | {
      type: "startRefine";
      requestId: number;
      step: RefineStep;
      text: string;
      answers?: ClarifyingAnswer[];
    }
  | { type: "cancelRefine" }
  /** Write the result, keeping the draft's wording for the rejected changes. */
  | { type: "applyResult"; original: string; output: string; rejected: number[] }
  | { type: "applyText"; text: string }
  /** For local learning: a finished result was replaced (accepted) or set aside. */
  | { type: "recordRefine"; mode: RefineMode; accepted: boolean };

export type TransitionResult = {
  model: ContentModel;
  effects: ContentEffect[];
};

export function createContentModel(
  enabled = true,
  debounceMs = 500,
  autoRefine = false,
): ContentModel {
  return {
    state: { kind: "detached" },
    text: "",
    enabled,
    autoRefine,
    debounceMs,
    lastRequestId: 0,
    undo: null,
  };
}

/** Undo is offered only while the input still holds exactly what was applied. */
export function canUndo(model: ContentModel) {
  return model.undo !== null && model.text === model.undo.applied;
}

/** Effects needed to abandon whatever async work the current state owns. */
function exitEffects(state: ContentState): ContentEffect[] {
  if (state.kind === "debouncing") return [{ type: "clearDebounce" }];
  if (state.kind === "streaming" || state.kind === "asking") {
    return [{ type: "cancelRefine" }];
  }
  return [];
}

function to(
  model: ContentModel,
  state: ContentState,
  effects: ContentEffect[] = [],
): TransitionResult {
  return { model: { ...model, state }, effects };
}

const unchanged = (model: ContentModel): TransitionResult => ({
  model,
  effects: [],
});

/** Whether the refine panel is on screen (the badge is hidden meanwhile). */
export function isPanelOpen(state: ContentState) {
  switch (state.kind) {
    case "picking":
    case "asking":
    case "answering":
      return true;
    case "streaming":
    case "result":
    case "failed":
      return state.visible;
    default:
      return false;
  }
}

const canRefine = (model: ContentModel) =>
  model.enabled && model.text.trim().length >= MIN_PROMPT_LENGTH;

/** Start a refine step now, abandoning whatever was in progress. */
function beginRefine(
  model: ContentModel,
  step: RefineStep,
  visible: boolean,
  answers?: ClarifyingAnswer[],
): TransitionResult {
  if (!canRefine(model)) return unchanged(model);
  const requestId = model.lastRequestId + 1;
  const state: ContentState =
    step === "ask"
      ? { kind: "asking", requestId }
      : { kind: "streaming", step, requestId, output: "", visible };
  return {
    model: { ...model, lastRequestId: requestId, state },
    effects: [
      ...exitEffects(model.state),
      { type: "startRefine", requestId, step, text: model.text, answers },
    ],
  };
}

/** Learning effect for leaving a visible result without replacing the draft. */
function setAside(state: ContentState): ContentEffect[] {
  if (state.kind !== "result" || !state.visible) return [];
  return [{ type: "recordRefine", mode: state.step === "compose" ? "ask" : state.step, accepted: false }];
}

function isCurrent(state: ContentState, requestId: number) {
  return (
    (state.kind === "streaming" || state.kind === "asking") &&
    state.requestId === requestId
  );
}

export function transition(
  model: ContentModel,
  event: ContentEvent,
): TransitionResult {
  const { state } = model;

  switch (event.type) {
    case "INPUT_ATTACHED":
      return state.kind === "detached" ? to(model, { kind: "idle" }) : unchanged(model);

    case "INPUT_DETACHED":
      return state.kind === "detached"
        ? unchanged(model)
        : to(model, { kind: "detached" }, exitEffects(state));

    case "PREFERENCES_CHANGED": {
      const next = {
        ...model,
        enabled: event.enabled,
        debounceMs: event.debounceMs,
        autoRefine: event.autoRefine,
      };
      if (event.enabled || state.kind === "detached" || state.kind === "idle") {
        return unchanged(next);
      }
      return to(next, { kind: "idle" }, exitEffects(state));
    }

    case "TEXT_CHANGED": {
      // Our own write while applying a suggestion must not start a new refine.
      if (state.kind === "detached" || state.kind === "applying") {
        return unchanged(model);
      }
      // Editing the draft makes any open panel, running refine or undo stale.
      const next = {
        ...model,
        text: event.text,
        undo: model.undo?.applied === event.text ? model.undo : null,
      };
      const effects = exitEffects(state);
      if (!canRefine(next) || !model.autoRefine) {
        return to(next, { kind: "idle" }, effects);
      }
      return to(next, { kind: "debouncing" }, [
        ...effects,
        { type: "startDebounce", ms: model.debounceMs },
      ]);
    }

    case "DEBOUNCE_ELAPSED":
      // The timer has fired, so there is nothing to clear: refine from idle.
      return state.kind === "debouncing"
        ? beginRefine({ ...model, state: { kind: "idle" } }, "improve", false)
        : unchanged(model);

    case "BADGE_CLICKED":
      switch (state.kind) {
        case "idle":
        case "debouncing":
        case "failed":
          return canRefine(model)
            ? to(model, { kind: "picking" }, exitEffects(state))
            : unchanged(model);
        case "streaming":
        case "result":
          // A background auto-refine: show it.
          return to(model, { ...state, visible: true });
        default:
          return unchanged(model);
      }

    case "MODE_CHOSEN": {
      if (!isPanelOpen(state)) return unchanged(model);
      const next = beginRefine(model, event.mode, true);
      return { ...next, effects: [...setAside(state), ...next.effects] };
    }

    case "SLASH_INSERT":
      // Only while typing: the menu is never open over the refine panel.
      if ((state.kind !== "idle" && state.kind !== "debouncing") || event.text === model.text) {
        return unchanged(model);
      }
      return to(model, { kind: "applying", previous: model.text, undoing: false }, [
        ...exitEffects(state),
        { type: "applyText", text: event.text },
      ]);

    case "CARD_CHOSEN": {
      // Free and local: add the card to the draft, close the picker, offer Undo.
      if (state.kind !== "picking") return unchanged(model);
      const text = withCard(model.text, event.text);
      if (text === model.text) return to(model, { kind: "idle" });
      return to(model, { kind: "applying", previous: model.text, undoing: false }, [
        { type: "applyText", text },
      ]);
    }

    case "REFINE_REQUESTED":
      switch (state.kind) {
        case "idle":
        case "debouncing":
        case "picking":
        case "result":
        case "failed": {
          const next = beginRefine(model, "improve", true);
          return { ...next, effects: [...setAside(state), ...next.effects] };
        }
        case "streaming":
          // Show a background refine rather than starting another one.
          return state.visible ? unchanged(model) : to(model, { ...state, visible: true });
        default:
          return unchanged(model);
      }

    case "REFINE_DELTA":
      if (state.kind !== "streaming" || state.requestId !== event.requestId) {
        return unchanged(model);
      }
      return to(model, { ...state, output: state.output + event.text });

    case "REFINE_DONE":
      // Replies for superseded requests are dropped.
      if (state.kind !== "streaming" || state.requestId !== event.requestId) {
        return unchanged(model);
      }
      return to(model, {
        kind: "result",
        step: state.step,
        output: event.text,
        visible: state.visible,
        rejected: [],
      });

    case "QUESTIONS_READY":
      if (state.kind !== "asking" || state.requestId !== event.requestId) {
        return unchanged(model);
      }
      return to(model, {
        kind: "answering",
        questions: event.questions,
        answers: event.questions.map(() => ""),
      });

    case "REFINE_FAILED":
      if (!isCurrent(state, event.requestId)) return unchanged(model);
      return to(model, {
        kind: "failed",
        step: state.kind === "streaming" ? state.step : "ask",
        message: event.message,
        visible: state.kind === "streaming" ? state.visible : true,
      });

    case "ANSWER_CHANGED": {
      if (state.kind !== "answering" || !(event.index in state.questions)) {
        return unchanged(model);
      }
      const answers = [...state.answers];
      answers[event.index] = event.value;
      return to(model, { ...state, answers });
    }

    case "ANSWERS_SUBMITTED":
      if (state.kind !== "answering") return unchanged(model);
      return beginRefine(
        model,
        "compose",
        true,
        state.questions.map((question, i) => ({ question, answer: state.answers[i] ?? "" })),
      );

    case "CHANGE_TOGGLED": {
      if (state.kind !== "result" || !state.visible || event.index < 0) {
        return unchanged(model);
      }
      const rejected = state.rejected.includes(event.index)
        ? state.rejected.filter((i) => i !== event.index)
        : [...state.rejected, event.index].sort((a, b) => a - b);
      return to(model, { ...state, rejected });
    }

    case "CHANGES_RESET":
      return state.kind === "result" && state.rejected.length > 0
        ? to(model, { ...state, rejected: [] })
        : unchanged(model);

    case "ACCEPT":
      if (state.kind !== "result" || !state.visible) return unchanged(model);
      return to(model, { kind: "applying", previous: model.text, undoing: false }, [
        {
          type: "recordRefine",
          mode: state.step === "compose" ? "ask" : state.step,
          accepted: true,
        },
        {
          type: "applyResult",
          original: model.text,
          output: state.output,
          rejected: state.rejected,
        },
      ]);

    case "UNDO_REQUESTED":
      if ((state.kind !== "idle" && state.kind !== "debouncing") || !canUndo(model)) {
        return unchanged(model);
      }
      return to(model, { kind: "applying", previous: model.text, undoing: true }, [
        ...exitEffects(state),
        { type: "applyText", text: model.undo!.previous },
      ]);

    case "DISMISS":
      return isPanelOpen(state)
        ? to(model, { kind: "idle" }, [...setAside(state), ...exitEffects(state)])
        : unchanged(model);

    case "APPLIED":
      // What was written is now the draft (its own input event was ignored).
      if (state.kind !== "applying") return unchanged(model);
      return to(
        {
          ...model,
          text: event.text,
          undo: state.undoing ? null : { previous: state.previous, applied: event.text },
        },
        { kind: "idle" },
      );
  }
}

export type KeyInput = {
  key: string;
  shiftKey: boolean;
  /** Ctrl on Windows/Linux or Cmd on macOS. */
  modKey: boolean;
  /** Whether the keydown came from inside the attached chat input. */
  inInput: boolean;
};

/**
 * Maps a keydown to a machine event, or null to let the page handle it.
 * Taken over: Esc while the panel is open, Tab in the chat input to accept a
 * finished result, and Ctrl/Cmd+Shift+Enter in the chat input to refine.
 */
export function keyToEvent(
  state: ContentState,
  input: KeyInput,
): ContentEvent | null {
  if (isPanelOpen(state) && input.key === "Escape") {
    return { type: "DISMISS" };
  }

  if (
    state.kind === "result" &&
    state.visible &&
    input.key === "Tab" &&
    !input.shiftKey &&
    input.inInput
  ) {
    return { type: "ACCEPT" };
  }

  if (input.inInput && input.key === "Enter" && input.shiftKey && input.modKey) {
    return { type: "REFINE_REQUESTED" };
  }

  return null;
}

export type LintChip = { label: string; hint: string };

/** What the driver's linter found for the current draft (see @plenz/core). */
export type LintSummary = {
  assessed: boolean;
  score: number;
  findings: Array<LintChip & { id: string }>;
};

/** Chips shown on the badge and picker; the rest are less important. */
export const MAX_LINT_CHIPS = 3;

export type BadgeView =
  | { kind: "hidden" }
  /** Local lint result; score is null when the draft can't be scored. */
  | { kind: "lint"; score: number | null; findings: LintChip[]; canUndo: boolean }
  | { kind: "saving" }
  /** A background refine finished; click to see it. */
  | { kind: "ready" }
  | { kind: "error"; message: string };

export type PanelView =
  | { kind: "picking"; recommended: RefineMode; findings: LintChip[] }
  | { kind: "streaming"; step: RefineStep; output: string }
  | { kind: "asking" }
  | { kind: "answering"; questions: string[]; answers: string[] }
  | {
      kind: "result";
      step: RefineStep;
      /** The draft being replaced, for the diff. */
      original: string;
      output: string;
      rejected: number[];
    }
  | { kind: "failed"; step: RefineStep; message: string };

export type ContentView = {
  badge: BadgeView;
  panel: PanelView | null;
};

const HIDDEN: BadgeView = { kind: "hidden" };

function topChips(lint: LintSummary | null): LintChip[] {
  if (!lint?.assessed) return [];
  return lint.findings.slice(0, MAX_LINT_CHIPS).map(({ label, hint }) => ({ label, hint }));
}

/**
 * Long or unstructured drafts are better served by Tighten; otherwise the
 * mode the user keeps accepting (see shared/learning.ts), else Improve.
 */
export function recommendedMode(
  lint: LintSummary | null,
  preferred: RefineMode | null = null,
): RefineMode {
  const ids = new Set(lint?.findings.map((f) => f.id));
  if (ids.has("too_long") || ids.has("wall_of_text")) return "tighten";
  return preferred ?? "improve";
}

function lintBadge(model: ContentModel, lint: LintSummary | null): BadgeView {
  if (!lint || !canRefine(model)) return HIDDEN;
  return {
    kind: "lint",
    score: lint.assessed ? lint.score : null,
    findings: topChips(lint),
    canUndo: canUndo(model),
  };
}

export function view(
  model: ContentModel,
  lint: LintSummary | null,
  preferredMode: RefineMode | null = null,
): ContentView {
  const { state } = model;
  switch (state.kind) {
    case "idle":
    case "debouncing":
      return { badge: lintBadge(model, lint), panel: null };
    case "picking":
      return {
        badge: HIDDEN,
        panel: {
          kind: "picking",
          recommended: recommendedMode(lint, preferredMode),
          findings: topChips(lint),
        },
      };
    case "streaming":
      return state.visible
        ? { badge: HIDDEN, panel: { kind: "streaming", step: state.step, output: state.output } }
        : { badge: { kind: "saving" }, panel: null };
    case "asking":
      return { badge: HIDDEN, panel: { kind: "asking" } };
    case "answering":
      return {
        badge: HIDDEN,
        panel: { kind: "answering", questions: state.questions, answers: state.answers },
      };
    case "result":
      return state.visible
        ? {
            badge: HIDDEN,
            panel: {
              kind: "result",
              step: state.step,
              original: model.text,
              output: state.output,
              rejected: state.rejected,
            },
          }
        : { badge: { kind: "ready" }, panel: null };
    case "failed":
      return state.visible
        ? { badge: HIDDEN, panel: { kind: "failed", step: state.step, message: state.message } }
        : { badge: { kind: "error", message: state.message }, panel: null };
    default:
      return { badge: HIDDEN, panel: null };
  }
}
