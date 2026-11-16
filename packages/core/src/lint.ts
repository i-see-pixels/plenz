// Tier-1 prompt linter: deterministic rubric checks that run on every
// keystroke, offline and for free. It never calls a model. The LLM refine
// is a separate, on-demand step.

export type LintCheckId =
  | "too_short"
  | "vague"
  | "no_goal"
  | "no_format"
  | "no_audience"
  | "no_length"
  | "no_constraints"
  | "too_long"
  | "wall_of_text";

/** What the draft is, which decides which checks are worth showing. */
export type DraftKind = "task" | "question" | "code";

export interface LintFinding {
  id: LintCheckId;
  /** Short chip text, e.g. "No output format". */
  label: string;
  /** One line on how to fix it. */
  hint: string;
  /** Points taken off the score. */
  weight: number;
}

export interface LintResult {
  /** False when the rubric doesn't apply (e.g. mostly non-Latin text). */
  assessed: boolean;
  kind: DraftKind;
  /** 0-100; 100 when nothing is missing. */
  score: number;
  /** Most important first. */
  findings: LintFinding[];
  wordCount: number;
}

type Draft = { text: string; words: number; kind: DraftKind };

type Check = Omit<LintFinding, "weight"> & {
  weight: number;
  appliesTo: DraftKind[];
  /** True when the draft has the problem. */
  test: (draft: Draft) => boolean;
};

const MIN_TASK_WORDS = 6;
const LONG_DRAFT_WORDS = 800;
const WALL_OF_TEXT_WORDS = 150;
const QUESTION_MAX_WORDS = 40;

const ALL: DraftKind[] = ["task", "question", "code"];
const missing = (pattern: RegExp) => (draft: Draft) => !pattern.test(draft.text);

// Any first-person detail or stated purpose counts as context.
const GOAL =
  /\b(because|so that|in order to|so i can|so we can|goal|purpose|context|background|i have|i've|i'm|i am|i need|i want|we have|we need|we're|my|our)\b/i;
// The shape of the answer, or a named deliverable that implies one.
const FORMAT =
  /\b(format|bullets?|bulleted|list|table|json|markdown|csv|yaml|outline|steps?|step-by-step|paragraphs?|headings?|sections?|numbered|template|summary|tl;?dr|email|letter|cover letter|essay|article|blog post|post|report|story|poem|tweet|thread|script|caption|slides?|plan|recipe|checklist|ideas|examples|names|questions|options|code|function|query|regex|diagram|table)\b/i;
const AUDIENCE =
  /\b(audience|readers?|tone|formal|casual|friendly|professional|playful|persuasive|explain (?:it )?like|eli5|for (?:a |an |my |the |our )?(?:[\w-]+ ){0,3}(?:family|team|friends?|kids?|children|parents?|boss|beginners?|experts?|audience|customers?|users?|managers?|recruiters?|hiring managers?|students?|developers?|engineers?|readers?|clients?|executives?|investors?|people))\b/i;
const LENGTH =
  /(\b\d+\s*(words?|sentences?|paragraphs?|bullets?|points?|lines?|items?|characters?|pages?|ideas|examples|options|tips|steps)\b|\b(short|shorter|brief|concise|detailed|in depth|in-depth|one[- ]?(?:line|liner|sentence|paragraph)|under \d+|at most|no more than|max(?:imum)?|length)\b)/i;
const CONSTRAINTS =
  /\b(must|should(?:n't)?|don'?t|do not|avoid|only|without|never|exactly|at least|limit|constraints?|requirements?|make sure|ensure|include|exclude|under|within|each|no|not|less than|more than|vegetarian|vegan|budget)\b/i;
const VAGUE =
  /\b(something|stuff|things|etc\.?|some kind of|whatever|make it (?:better|good|nice|pop)|improve it)\b/i;

const CODE =
  /```|\b[A-Z]\w*(?:Error|Exception)\b|\b(bug|debug|stack ?trace|traceback|compile|compiler|refactor|segfault|null pointer|undefined is not)\b/i;
const QUESTION_START =
  /^(how|what|what's|why|when|where|which|who|is|are|can|could|does|do|did|should|would|will|explain|define|tell me)\b/i;

// Ordered by weight, so findings come out most important first.
const CHECKS: Check[] = [
  {
    id: "too_short",
    label: "Too short",
    hint: "Add what you want, for whom and why. A few details make answers specific.",
    weight: 25,
    appliesTo: ["task", "code"],
    test: (d) => d.words < MIN_TASK_WORDS,
  },
  {
    id: "no_goal",
    label: "No goal or context",
    hint: "Say why you need it or what it's for (\"for my team's launch post…\").",
    weight: 15,
    appliesTo: ALL,
    test: missing(GOAL),
  },
  {
    id: "no_format",
    label: "No output format",
    hint: "Name the shape of the answer: bullets, a table, JSON, an email, steps…",
    weight: 15,
    appliesTo: ["task"],
    test: missing(FORMAT),
  },
  {
    id: "no_audience",
    label: "No audience or tone",
    hint: "Who is it for, and how should it sound? (\"for non-technical managers, friendly\")",
    weight: 10,
    appliesTo: ["task"],
    test: missing(AUDIENCE),
  },
  {
    id: "no_length",
    label: "No length",
    hint: "Set a size: \"under 150 words\", \"3 bullets\", \"one paragraph\".",
    weight: 10,
    appliesTo: ["task"],
    test: missing(LENGTH),
  },
  {
    id: "no_constraints",
    label: "No constraints",
    hint: "Add must-haves and must-nots (\"avoid jargon\", \"only use the data below\").",
    weight: 10,
    appliesTo: ["task"],
    test: missing(CONSTRAINTS),
  },
  {
    id: "vague",
    label: "Vague wording",
    hint: "Replace words like \"stuff\", \"things\" or \"make it better\" with specifics.",
    weight: 10,
    appliesTo: ALL,
    test: (d) => VAGUE.test(d.text),
  },
  {
    id: "too_long",
    label: "Long draft",
    hint: "Very long prompts dilute focus. Cut what the model doesn't need.",
    weight: 10,
    appliesTo: ALL,
    test: (d) => d.words > LONG_DRAFT_WORDS,
  },
  {
    id: "wall_of_text",
    label: "Wall of text",
    hint: "Break it into parts: context, task, format.",
    weight: 10,
    appliesTo: ALL,
    test: (d) => d.words > WALL_OF_TEXT_WORDS && !/\n/.test(d.text),
  },
];

/** The rubric's word patterns are English; skip drafts that are mostly other scripts. */
function isMostlyLatin(text: string) {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return false;
  const latin = letters.filter((ch) => /[A-Za-zÀ-ɏ]/.test(ch)).length;
  return latin / letters.length >= 0.6;
}

export function classifyDraft(text: string, words: number): DraftKind {
  if (CODE.test(text)) return "code";
  if (words <= QUESTION_MAX_WORDS && (text.endsWith("?") || QUESTION_START.test(text))) {
    return "question";
  }
  return "task";
}

export function lintPrompt(text: string): LintResult {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const kind = classifyDraft(trimmed, words);

  if (!isMostlyLatin(trimmed)) {
    return { assessed: false, kind, score: 100, findings: [], wordCount: words };
  }

  const draft: Draft = { text: trimmed, words, kind };
  const findings = CHECKS.filter(
    (check) => check.appliesTo.includes(kind) && check.test(draft),
  ).map(({ id, label, hint, weight }) => ({ id, label, hint, weight }));

  const penalty = findings.reduce((sum, finding) => sum + finding.weight, 0);
  return {
    assessed: true,
    kind,
    score: Math.max(0, 100 - penalty),
    findings,
    wordCount: words,
  };
}
