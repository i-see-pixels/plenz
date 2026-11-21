// Pure state for the "save / edit a private prompt" dialog in the side panel.
// Replaces four loose fields (open flag, mode, draft, submitting flag) whose
// combinations could disagree, e.g. a closed dialog that was still submitting.

import type { PromptDraft, PromptDraftMode } from "./prompt-gallery.types";

export type PromptModalState =
  | { kind: "closed" }
  | { kind: "editing"; mode: PromptDraftMode; draft: PromptDraft }
  | { kind: "submitting"; mode: PromptDraftMode; draft: PromptDraft };

export type PromptModalEvent =
  | { type: "OPEN"; mode: PromptDraftMode; draft: PromptDraft }
  | { type: "EDIT"; field: "title" | "prompt"; value: string }
  | { type: "SUBMIT" }
  | { type: "SUBMIT_SUCCEEDED" }
  | { type: "SUBMIT_FAILED" }
  | { type: "CLOSE" };

export const EMPTY_DRAFT: PromptDraft = {
  savedPromptId: null,
  prompt: "",
  title: "",
};

export function promptModalTransition(
  state: PromptModalState,
  event: PromptModalEvent,
): PromptModalState {
  switch (event.type) {
    case "OPEN":
      return state.kind === "submitting"
        ? state
        : { kind: "editing", mode: event.mode, draft: event.draft };

    case "EDIT":
      return state.kind === "editing"
        ? { ...state, draft: { ...state.draft, [event.field]: event.value } }
        : state;

    case "SUBMIT":
      return state.kind === "editing"
        ? { ...state, kind: "submitting" }
        : state;

    case "SUBMIT_SUCCEEDED":
      return state.kind === "submitting" ? { kind: "closed" } : state;

    case "SUBMIT_FAILED":
      // Keep the draft so the user can retry without retyping.
      return state.kind === "submitting"
        ? { ...state, kind: "editing" }
        : state;

    case "CLOSE":
      // A save in flight finishes first; closing mid-save would lose its result.
      return state.kind === "editing" ? { kind: "closed" } : state;
  }
}
