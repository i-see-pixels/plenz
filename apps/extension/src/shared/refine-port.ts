// Streaming refine protocol. The content script opens one port per refine,
// sends START, and gets DELTA chunks then exactly one DONE, QUESTIONS or
// ERROR. Disconnecting the port cancels the provider request, so abandoned
// refines stop being billed.

import type { ClarifyingAnswer, RefineStep } from "@plenz/core";
import type { RefineContext } from "@plenz/types";

export const REFINE_PORT = "plenz-refine";

/** Longest draft accepted, to keep a runaway paste from becoming a huge bill. */
export const MAX_REFINE_DRAFT_CHARS = 40_000;

export const REFINE_STEPS: readonly RefineStep[] = [
  "improve",
  "tighten",
  "structure",
  "ask",
  "compose",
];

export type RefineStart = {
  type: "START";
  step: RefineStep;
  draft: string;
  context?: RefineContext;
  /** Local lint labels, used by improve. */
  missing?: string[];
  /** Ask me answers, used by compose. */
  answers?: ClarifyingAnswer[];
};

export type RefineServerMessage =
  | { type: "DELTA"; text: string }
  | { type: "DONE"; text: string; providerId: string }
  | { type: "QUESTIONS"; questions: string[]; providerId: string }
  /** `message` is plain language; `detail` is the provider's wording. */
  | {
      type: "ERROR";
      message: string;
      detail?: string;
      fixInSettings?: boolean;
    };

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** Runtime check: the port is reachable from content scripts in third-party pages. */
export function isRefineStart(value: unknown): value is RefineStart {
  if (!value || typeof value !== "object") return false;
  const start = value as Partial<RefineStart>;
  return (
    start.type === "START" &&
    REFINE_STEPS.includes(start.step as RefineStep) &&
    typeof start.draft === "string" &&
    start.draft.trim().length > 0 &&
    start.draft.length <= MAX_REFINE_DRAFT_CHARS &&
    (start.missing === undefined || isStringArray(start.missing)) &&
    (start.answers === undefined ||
      (Array.isArray(start.answers) &&
        start.answers.every(
          (a) =>
            a && typeof a.question === "string" && typeof a.answer === "string",
        )))
  );
}
