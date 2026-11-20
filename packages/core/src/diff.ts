// Word-level diff between the user's draft and a refined prompt, grouped
// into changes the user can accept or reject one by one.

export type DiffSegment =
  | { kind: "same"; text: string }
  /** One change: `removed` from the draft, `added` by the refine (either may be ""). */
  | { kind: "change"; index: number; removed: string; added: string };

export interface PromptDiff {
  segments: DiffSegment[];
  changeCount: number;
  /** Share of the refined text that is unchanged from the draft (0-1). */
  similarity: number;
  /** True when the texts were too large or too different to diff word by word. */
  wholesale: boolean;
}

/** Above this many tokens (draft + result) we show one wholesale change. */
const MAX_TOKENS = 12_000;
/**
 * Myers search budget; past it the texts are too different to be worth
 * diffing. The trace grows with edits squared, so this also caps memory
 * (about 4 MB at the limit).
 */
const MAX_EDITS = 1_000;

const TOKEN = /\s+|[\p{L}\p{N}_'’-]+|[^\s\p{L}\p{N}_]/gu;

export function tokenize(text: string): string[] {
  return text.match(TOKEN) ?? [];
}

type Op = { kind: "same" | "del" | "ins"; token: string };

/** Myers' O(ND) diff over tokens; null when it needs more than `maxEdits`. */
function myers(a: string[], b: string[], maxEdits: number): Op[] | null {
  const n = a.length;
  const m = b.length;
  const max = Math.min(n + m, maxEdits);
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];

  for (let d = 0; d <= max; d++) {
    // Round d only reads diagonals -d-1..d+1, so keep just that band.
    trace.push(v.slice(offset - d - 1, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])
          ? v[offset + k + 1]
          : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) return backtrack(trace, a, b, d);
    }
  }
  return null;
}

function backtrack(
  trace: Int32Array[],
  a: string[],
  b: string[],
  dEnd: number,
) {
  const ops: Op[] = [];
  let x = a.length;
  let y = b.length;

  for (let d = dEnd; d > 0; d--) {
    // trace[d] is the band before round d; diagonal k sits at index k + d + 1.
    const band = trace[d];
    const at = (k: number) => band[k + d + 1];
    const k = x - y;
    const prevK =
      k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    // Walk back along the diagonal (matching tokens), then take the one edit.
    while (x > prevX && y > prevY) {
      x--;
      y--;
      ops.push({ kind: "same", token: a[x] });
    }
    if (x === prevX) {
      y--;
      ops.push({ kind: "ins", token: b[y] });
    } else {
      x--;
      ops.push({ kind: "del", token: a[x] });
    }
  }
  while (x > 0 && y > 0) {
    x--;
    y--;
    ops.push({ kind: "same", token: a[x] });
  }
  return ops.reverse();
}

const isBlank = (text: string) => text.trim() === "";

/**
 * Turn token ops into segments. Changes separated only by whitespace are
 * merged, so "the quick brown" → "a slow red" is one change, not three.
 */
function toSegments(ops: Op[]): DiffSegment[] {
  type Run = { same: boolean; removed: string; added: string };
  const runs: Run[] = [];
  for (const op of ops) {
    const same = op.kind === "same";
    let run = runs[runs.length - 1];
    if (!run || run.same !== same) {
      run = { same, removed: "", added: "" };
      runs.push(run);
    }
    if (op.kind !== "ins") run.removed += op.token;
    if (op.kind !== "del") run.added += op.token;
  }

  // Absorb whitespace-only "same" runs that sit between two changes.
  const merged: Run[] = [];
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const prev = merged[merged.length - 1];
    const next = runs[i + 1];
    if (
      run.same &&
      prev &&
      !prev.same &&
      next &&
      !next.same &&
      isBlank(run.removed)
    ) {
      prev.removed += run.removed + next.removed;
      prev.added += run.added + next.added;
      i++;
      continue;
    }
    if (!run.same && prev && !prev.same) {
      prev.removed += run.removed;
      prev.added += run.added;
      continue;
    }
    merged.push({ ...run });
  }

  // Whitespace at the edges that both sides share isn't a change; show it as
  // unchanged so highlights hug the words.
  const segments: DiffSegment[] = [];
  const pushSame = (text: string) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last?.kind === "same") last.text += text;
    else segments.push({ kind: "same", text });
  };
  let index = 0;
  for (const run of merged) {
    if (run.same) {
      pushSame(run.added);
      continue;
    }
    const lead = sharedWhitespace(run.removed, run.added, "start");
    const removed = run.removed.slice(lead.length);
    const added = run.added.slice(lead.length);
    const trail = sharedWhitespace(removed, added, "end");
    if (removed.length === trail.length && added.length === trail.length) {
      pushSame(run.added); // Nothing left but shared whitespace.
      continue;
    }
    pushSame(lead);
    segments.push({
      kind: "change",
      index: index++,
      removed: removed.slice(0, removed.length - trail.length),
      added: added.slice(0, added.length - trail.length),
    });
    pushSame(trail);
  }
  return segments;
}

function sharedWhitespace(a: string, b: string, edge: "start" | "end") {
  const pattern = edge === "start" ? /^\s+/ : /\s+$/;
  const wa = a.match(pattern)?.[0] ?? "";
  const wb = b.match(pattern)?.[0] ?? "";
  let n = 0;
  while (
    n < wa.length &&
    n < wb.length &&
    (edge === "start"
      ? wa[n] === wb[n]
      : wa[wa.length - 1 - n] === wb[wb.length - 1 - n])
  ) {
    n++;
  }
  return edge === "start" ? wa.slice(0, n) : wa.slice(wa.length - n);
}

function wholesaleDiff(before: string, after: string): PromptDiff {
  return {
    segments:
      before === after
        ? [{ kind: "same", text: after }]
        : [{ kind: "change", index: 0, removed: before, added: after }],
    changeCount: before === after ? 0 : 1,
    similarity: before === after ? 1 : 0,
    wholesale: before !== after,
  };
}

export function diffPrompts(before: string, after: string): PromptDiff {
  if (before === after) return wholesaleDiff(before, after);

  const a = tokenize(before);
  const b = tokenize(after);
  const ops = a.length + b.length <= MAX_TOKENS ? myers(a, b, MAX_EDITS) : null;
  if (!ops) return wholesaleDiff(before, after);

  const segments = toSegments(ops);
  const sameChars = segments.reduce(
    (sum, segment) => sum + (segment.kind === "same" ? segment.text.length : 0),
    0,
  );
  const changeCount = segments.filter(
    (segment) => segment.kind === "change",
  ).length;
  return {
    segments,
    changeCount,
    similarity: after.length > 0 ? sameChars / after.length : 0,
    wholesale: false,
  };
}

/** Build the final text: rejected changes keep the draft's wording. */
export function applyDiff(
  diff: PromptDiff,
  rejected: Iterable<number> = [],
): string {
  const keep = new Set(rejected);
  return diff.segments
    .map((segment) =>
      segment.kind === "same"
        ? segment.text
        : keep.has(segment.index)
          ? segment.removed
          : segment.added,
    )
    .join("");
}
