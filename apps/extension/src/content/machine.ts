import type { Suggestion } from "@plenz/types";

// Pure state machine for the in-page flow. No DOM, timers or messaging here:
// `transition` returns the next model plus effects for the driver to run,
// and `view` projects a model onto what the badge, popover and ghost text show.

export const MIN_PROMPT_LENGTH = 10;

export type ContentState =
  | { kind: "detached" }
  | { kind: "idle" }
  | { kind: "debouncing"; text: string }
  | { kind: "analyzing"; text: string; requestId: number }
  | { kind: "ready"; text: string; suggestions: Suggestion[] }
  | {
      kind: "open";
      text: string;
      suggestions: Suggestion[];
      activeIndex: number;
    }
  | { kind: "applying" }
  | { kind: "error"; message: string };

export type ContentModel = {
  state: ContentState;
  enabled: boolean;
  debounceMs: number;
  lastRequestId: number;
};

export type ContentEvent =
  | { type: "INPUT_ATTACHED" }
  | { type: "INPUT_DETACHED" }
  | { type: "PREFERENCES_CHANGED"; enabled: boolean; debounceMs: number }
  | { type: "TEXT_CHANGED"; text: string }
  | { type: "DEBOUNCE_ELAPSED" }
  | { type: "ANALYSIS_SUCCEEDED"; requestId: number; suggestions: Suggestion[] }
  | { type: "ANALYSIS_FAILED"; requestId: number; message: string }
  | { type: "OPEN_REQUESTED" }
  | { type: "NAVIGATE"; direction: "up" | "down" }
  | { type: "SELECT"; index: number }
  | { type: "ACCEPT" }
  | { type: "DISMISS" }
  | { type: "APPLIED" };

export type ContentEffect =
  | { type: "startDebounce"; ms: number }
  | { type: "clearDebounce" }
  | { type: "requestAnalysis"; text: string; requestId: number }
  | { type: "cancelAnalysis" }
  | { type: "applyText"; text: string };

export type TransitionResult = {
  model: ContentModel;
  effects: ContentEffect[];
};

export function createContentModel(
  enabled = true,
  debounceMs = 500,
): ContentModel {
  return { state: { kind: "detached" }, enabled, debounceMs, lastRequestId: 0 };
}

/** Effects needed to abandon whatever async work the current state owns. */
function exitEffects(state: ContentState): ContentEffect[] {
  if (state.kind === "debouncing") return [{ type: "clearDebounce" }];
  if (state.kind === "analyzing") return [{ type: "cancelAnalysis" }];
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
      };
      if (event.enabled || state.kind === "detached" || state.kind === "idle") {
        return unchanged(next);
      }
      return to(next, { kind: "idle" }, exitEffects(state));
    }

    case "TEXT_CHANGED": {
      // Our own write while applying a suggestion must not start a new paid analysis.
      if (state.kind === "detached" || state.kind === "applying") {
        return unchanged(model);
      }
      const effects = exitEffects(state);
      if (!model.enabled || event.text.length < MIN_PROMPT_LENGTH) {
        return to(model, { kind: "idle" }, effects);
      }
      return to(model, { kind: "debouncing", text: event.text }, [
        ...effects,
        { type: "startDebounce", ms: model.debounceMs },
      ]);
    }

    case "DEBOUNCE_ELAPSED": {
      if (state.kind !== "debouncing") return unchanged(model);
      const requestId = model.lastRequestId + 1;
      return {
        model: {
          ...model,
          lastRequestId: requestId,
          state: { kind: "analyzing", text: state.text, requestId },
        },
        effects: [{ type: "requestAnalysis", text: state.text, requestId }],
      };
    }

    case "ANALYSIS_SUCCEEDED":
      // Responses for superseded requests are dropped.
      if (state.kind !== "analyzing" || state.requestId !== event.requestId) {
        return unchanged(model);
      }
      return event.suggestions.length > 0
        ? to(model, {
            kind: "ready",
            text: state.text,
            suggestions: event.suggestions,
          })
        : to(model, { kind: "idle" });

    case "ANALYSIS_FAILED":
      if (state.kind !== "analyzing" || state.requestId !== event.requestId) {
        return unchanged(model);
      }
      return to(model, { kind: "error", message: event.message });

    case "OPEN_REQUESTED":
      if (state.kind !== "ready") return unchanged(model);
      return to(model, { ...state, kind: "open", activeIndex: 0 });

    case "NAVIGATE": {
      if (state.kind !== "open") return unchanged(model);
      const count = state.suggestions.length;
      const step = event.direction === "down" ? 1 : -1;
      return to(model, {
        ...state,
        activeIndex: (state.activeIndex + step + count) % count,
      });
    }

    case "SELECT": {
      if (state.kind !== "open") return unchanged(model);
      const suggestion = state.suggestions[event.index];
      if (!suggestion) return unchanged(model);
      return to(model, { kind: "applying" }, [
        { type: "applyText", text: suggestion.suggested },
      ]);
    }

    case "ACCEPT": {
      if (state.kind !== "open") return unchanged(model);
      const suggestion = state.suggestions[state.activeIndex];
      if (!suggestion) return unchanged(model);
      return to(model, { kind: "applying" }, [
        { type: "applyText", text: suggestion.suggested },
      ]);
    }

    case "DISMISS":
      if (state.kind !== "open") return unchanged(model);
      return to(model, {
        kind: "ready",
        text: state.text,
        suggestions: state.suggestions,
      });

    case "APPLIED":
      return state.kind === "applying" ? to(model, { kind: "idle" }) : unchanged(model);
  }
}

export type KeyInput = {
  key: string;
  shiftKey: boolean;
  /** Whether the keydown came from inside the attached chat input. */
  inInput: boolean;
};

/**
 * Maps a keydown to a machine event, or null to let the page handle it.
 * Keys are only taken over while the popover is open, plus Tab in the chat
 * input when suggestions are waiting behind the badge.
 */
export function keyToEvent(
  state: ContentState,
  input: KeyInput,
): ContentEvent | null {
  if (state.kind === "open") {
    switch (input.key) {
      case "Tab":
        return { type: "ACCEPT" };
      case "Escape":
        return { type: "DISMISS" };
      case "ArrowUp":
        return { type: "NAVIGATE", direction: "up" };
      case "ArrowDown":
        return { type: "NAVIGATE", direction: "down" };
      default:
        return null;
    }
  }

  if (
    state.kind === "ready" &&
    input.key === "Tab" &&
    !input.shiftKey &&
    input.inInput
  ) {
    return { type: "OPEN_REQUESTED" };
  }

  return null;
}

export type BadgeView =
  | { kind: "hidden" }
  | { kind: "saving" }
  | { kind: "count"; count: number }
  | { kind: "error"; message: string };

export type ContentView = {
  badge: BadgeView;
  overlay: { suggestions: Suggestion[]; activeIndex: number } | null;
  ghost: { text: string; suggestion: string } | null;
};

export function view(state: ContentState): ContentView {
  switch (state.kind) {
    case "analyzing":
      return { badge: { kind: "saving" }, overlay: null, ghost: null };
    case "ready":
      return {
        badge: { kind: "count", count: state.suggestions.length },
        overlay: null,
        ghost: { text: state.text, suggestion: state.suggestions[0].suggested },
      };
    case "open":
      return {
        badge: { kind: "hidden" },
        overlay: {
          suggestions: state.suggestions,
          activeIndex: state.activeIndex,
        },
        ghost: { text: state.text, suggestion: state.suggestions[0].suggested },
      };
    case "error":
      return {
        badge: { kind: "error", message: state.message },
        overlay: null,
        ghost: null,
      };
    default:
      return { badge: { kind: "hidden" }, overlay: null, ghost: null };
  }
}
