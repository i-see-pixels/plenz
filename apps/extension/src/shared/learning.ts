import type { RefineMode } from "@plenz/types";

// Local learning: what plenz notices about how you use it, kept on this
// device only (chrome.storage.local), never sent anywhere.
//
// - Refine modes: each result you replace with counts as accepted; each one
//   you close or swap for another mode counts as dismissed. A mode you keep
//   accepting becomes the picker's "Suggested" one.
// - Prompt checks: when you send a draft, the checks still flagged on it
//   count as ignored, and checks flagged earlier on that draft but gone by
//   then count as fixed. A check you keep ignoring stops being shown and no
//   longer costs points.
//
// Counts are halved past a cap so recent habits outweigh old ones.

export const LEARNING_STORAGE_KEY = "learning";

export type ModeStats = { accepted: number; dismissed: number };
export type CheckStats = { fixed: number; ignored: number };

export type Learning = {
  modes: Partial<Record<RefineMode, ModeStats>>;
  checks: Record<string, CheckStats>;
};

export type LearningEvent =
  | { type: "refine"; mode: RefineMode; accepted: boolean }
  | { type: "sent"; fixed: string[]; ignored: string[] };

const MODES: RefineMode[] = ["improve", "tighten", "structure", "ask"];
/** Past this many outcomes for one mode or check, counts are halved. */
const HISTORY_CAP = 40;
const MAX_CHECK_IDS = 20;
const CHECK_ID = /^[a-z_]{1,40}$/;

/** A mode needs this many accepted results before it is suggested. */
export const MIN_ACCEPTS_TO_SUGGEST = 3;
/** A check is hidden after being ignored this many times, and far more often than fixed. */
export const MIN_IGNORES_TO_HIDE = 5;

export const emptyLearning = (): Learning => ({ modes: {}, checks: {} });

const count = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

/** Whatever is in storage, as usable stats. */
export function normalizeLearning(value: unknown): Learning {
  const learning = emptyLearning();
  if (!value || typeof value !== "object") return learning;
  const { modes, checks } = value as { modes?: unknown; checks?: unknown };
  if (modes && typeof modes === "object") {
    for (const mode of MODES) {
      const stats = (modes as Record<string, Partial<ModeStats> | undefined>)[mode];
      if (stats && typeof stats === "object") {
        learning.modes[mode] = { accepted: count(stats.accepted), dismissed: count(stats.dismissed) };
      }
    }
  }
  if (checks && typeof checks === "object") {
    for (const [id, stats] of Object.entries(checks as Record<string, Partial<CheckStats>>)) {
      if (!CHECK_ID.test(id) || !stats || typeof stats !== "object") continue;
      learning.checks[id] = { fixed: count(stats.fixed), ignored: count(stats.ignored) };
    }
  }
  return learning;
}

function decay<T extends Record<string, number>>(stats: T): T {
  const total = Object.values(stats).reduce((sum, n) => sum + n, 0);
  if (total <= HISTORY_CAP) return stats;
  return Object.fromEntries(
    Object.entries(stats).map(([key, n]) => [key, Math.round(n / 2)]),
  ) as T;
}

/** Validates an event from a content script; null if it isn't one. */
export function parseLearningEvent(value: unknown): LearningEvent | null {
  if (!value || typeof value !== "object") return null;
  const event = value as Partial<Record<string, unknown>>;
  if (event.type === "refine") {
    return MODES.includes(event.mode as RefineMode) && typeof event.accepted === "boolean"
      ? { type: "refine", mode: event.mode as RefineMode, accepted: event.accepted }
      : null;
  }
  if (event.type === "sent") {
    const ids = (list: unknown) =>
      Array.isArray(list)
        ? [...new Set(list.filter((id): id is string => typeof id === "string" && CHECK_ID.test(id)))].slice(
            0,
            MAX_CHECK_IDS,
          )
        : null;
    const fixed = ids(event.fixed);
    const ignored = ids(event.ignored);
    return fixed && ignored ? { type: "sent", fixed, ignored } : null;
  }
  return null;
}

export function recordLearning(learning: Learning, event: LearningEvent): Learning {
  if (event.type === "refine") {
    const stats = learning.modes[event.mode] ?? { accepted: 0, dismissed: 0 };
    const next = event.accepted
      ? { ...stats, accepted: stats.accepted + 1 }
      : { ...stats, dismissed: stats.dismissed + 1 };
    return { ...learning, modes: { ...learning.modes, [event.mode]: decay(next) } };
  }
  const checks = { ...learning.checks };
  for (const id of event.fixed) {
    const stats = checks[id] ?? { fixed: 0, ignored: 0 };
    checks[id] = decay({ ...stats, fixed: stats.fixed + 1 });
  }
  for (const id of event.ignored) {
    const stats = checks[id] ?? { fixed: 0, ignored: 0 };
    checks[id] = decay({ ...stats, ignored: stats.ignored + 1 });
  }
  return { ...learning, checks };
}

/** The mode you accept most, once you've accepted it enough and keep more than you close. */
export function preferredMode(learning: Learning): RefineMode | null {
  let best: RefineMode | null = null;
  let bestAccepted = 0;
  for (const mode of MODES) {
    const stats = learning.modes[mode];
    if (!stats || stats.accepted < MIN_ACCEPTS_TO_SUGGEST) continue;
    if (stats.accepted < stats.dismissed) continue;
    if (stats.accepted > bestAccepted) {
      best = mode;
      bestAccepted = stats.accepted;
    }
  }
  return best;
}

/** Checks you send drafts past again and again, and rarely act on. */
export function hiddenChecks(learning: Learning): Set<string> {
  const hidden = new Set<string>();
  for (const [id, stats] of Object.entries(learning.checks)) {
    if (stats.ignored >= MIN_IGNORES_TO_HIDE && stats.ignored > 3 * stats.fixed) hidden.add(id);
  }
  return hidden;
}
