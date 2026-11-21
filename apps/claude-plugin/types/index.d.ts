export type Finding = { id: string; label: string; hint: string };

/** The prompt check for the draft now in the box. */
export type Check = { score: number; findings: Finding[] };

export type RefineStep =
  | "improve"
  | "tighten"
  | "structure"
  | "ask"
  | "compose";

/** Where the on-demand refine stands; `draft` is the prompt it started from. */
export type Refine =
  | { phase: "idle" }
  | { phase: "working"; step: RefineStep; draft: string }
  | { phase: "ready"; step: RefineStep; draft: string; text: string }
  | { phase: "asking"; draft: string; questions: string[]; answers: string[] }
  | { phase: "applied"; draft: string }
  | { phase: "error"; message: string };

declare module "claude-code" {
  interface PluginState {
    plenz: { check: Check | null; refine: Refine };
  }
}
