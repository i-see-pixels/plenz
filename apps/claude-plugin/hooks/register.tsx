import type { EngineInterface, Register, RenderChildren } from "claude-code";
import { atom, read, update } from "claude-code";

import type { Check, Refine, RefineStep } from "../types";
import { diffPrompts } from "./core/diff";
import { lintPrompt } from "./core/lint";
import {
  buildRefineRequest,
  cleanRefineOutput,
  parseClarifyingQuestions,
} from "./core/refine";

/** Words before the check shows; plenz keeps short drafts quiet too. */
const MIN_WORDS = 3;
const MODEL = "haiku";
const MODES = [
  { step: "improve", label: "Improve", working: "Improving" },
  { step: "tighten", label: "Tighten", working: "Tightening" },
  { step: "structure", label: "Structure", working: "Structuring" },
  { step: "ask", label: "Ask me", working: "Thinking of questions" },
] as const;

const check = atom({ plugin: "plenz", key: "check" } as const, null);
const refine = atom(
  { plugin: "plenz", key: "refine" } as const,
  { phase: "idle" } as Refine,
);

type $ = EngineInterface;

/** The check for a draft, or null when there is nothing to show. */
export function checkDraft(text: string): Check | null {
  const trimmed = text.trim();
  // Slash commands, shell (!) and memory (#) entries are not prompts.
  if (!trimmed || /^[/!#]/.test(trimmed)) return null;
  const result = lintPrompt(trimmed);
  if (!result.assessed || result.wordCount < MIN_WORDS) return null;
  return {
    score: result.score,
    findings: result.findings.map(({ id, label, hint }) => ({
      id,
      label,
      hint,
    })),
  };
}

const sameCheck = (a: Check | null, b: Check | null) =>
  a === null || b === null
    ? a === b
    : a.score === b.score &&
      a.findings.map((f) => f.id).join() === b.findings.map((f) => f.id).join();

async function recheck($: $, text: string) {
  const next = checkDraft(text);
  if (!sameCheck(await read($, check), next))
    await update($, check, () => next);
}

let stop = new AbortController();

const setRefine = ($: $, next: Refine) => update($, refine, () => next);

async function reset($: $) {
  stop.abort();
  await setRefine($, { phase: "idle" });
}

async function run(
  $: $,
  step: RefineStep,
  draft: string,
  answers?: { question: string; answer: string }[],
) {
  stop.abort();
  stop = new AbortController();
  const signal = stop.signal;
  await setRefine($, { phase: "working", step, draft });

  const missing =
    step === "improve"
      ? lintPrompt(draft).findings.map((f) => f.label)
      : undefined;
  const request = buildRefineRequest({ step, draft, missing, answers });
  const reply = await $.model.complete(
    {
      model: MODEL,
      system: request.system,
      prompt: request.user,
      maxTokens: request.maxTokens,
      effort: "low",
      timeoutMs: 60_000,
    },
    { signal },
  );
  if (signal.aborted) return;

  let next: Refine;
  if (!reply.isAnswered) {
    next = {
      phase: "error",
      message:
        reply.reason === "aborted"
          ? "Refine timed out."
          : `Refine failed (${reply.reason}).`,
    };
  } else if (step === "ask") {
    const questions = parseClarifyingQuestions(reply.text);
    next = questions.length
      ? { phase: "asking", draft, questions, answers: questions.map(() => "") }
      : {
          phase: "error",
          message: "No questions came back. Try Improve instead.",
        };
  } else {
    next = { phase: "ready", step, draft, text: cleanRefineOutput(reply.text) };
  }
  await setRefine($, next);
}

/** Puts the refined prompt in the box, keeping the draft for Undo. */
async function replace($: $) {
  const cur = await read($, refine);
  if (cur.phase !== "ready") return;
  const filled = await $.prompt.fill({ text: cur.text, mode: "replace" });
  if (filled.isFilled)
    await setRefine($, { phase: "applied", draft: cur.draft });
  else $.ui.toast("plenz: the prompt box is busy, try again");
}

async function undo($: $) {
  const cur = await read($, refine);
  if (cur.phase !== "applied") return;
  await $.prompt.fill({ text: cur.draft, mode: "replace" });
  await reset($);
}

const setAnswer = ($: $, i: number, value: string) =>
  update($, refine, (cur) =>
    cur.phase === "asking"
      ? { ...cur, answers: cur.answers.map((a, j) => (j === i ? value : a)) }
      : cur,
  );

export const register: Register = (on) => {
  // Every keystroke or paste: re-check, and drop a refine made for older text.
  on("prompt.edit", async ($, e, next) => {
    const box = await next(e);
    await recheck($, box.text);
    const r = await read($, refine);
    if (
      r.phase !== "idle" &&
      (r.phase === "applied" ||
        r.phase === "error" ||
        r.draft !== box.text.trim())
    ) {
      await reset($);
    }
    return box;
  });

  // A submit, history recall, undo or a fill (ours included).
  on("prompt.change", async ($, e, next) => {
    await recheck($, e.text);
    if (e.origin.kind === "clear" || e.origin.kind === "history")
      await reset($);
    return next(e);
  });

  // Layout rule: a row holds only Text or only Buttons, never both, so no
  // label is drawn under a button; button rows wrap on a narrow window.
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e);
    const r = await read($, refine);
    const result = await read($, check);
    const { Box, Text, Button, Input } = $.ui.resolve(e);

    const heading = (status: string, color?: "error") => (
      <Text>
        <Text color="claude" bold>
          plenz
        </Text>
        <Text color={color} dimColor={color ? undefined : true}>
          {"  "}
          {status}
        </Text>
      </Text>
    );
    const buttons = (children: RenderChildren) => (
      <Box
        flexDirection="row"
        flexWrap="wrap"
        columnGap={1}
        rowGap={0}
        marginTop={1}
      >
        {children}
      </Box>
    );
    const frame = (...rows: RenderChildren[]) => (
      <Box flexDirection="column">{rows}</Box>
    );

    if (r.phase === "working") {
      const mode = MODES.find((m) => m.step === r.step);
      return frame(
        heading(`${mode ? mode.working : "Writing your prompt"}…`),
        buttons(
          <Button key="cancel" label="Cancel" onPress={() => reset($)} />,
        ),
      );
    }

    if (r.phase === "ready") {
      const diff = diffPrompts(r.draft, r.text);
      return frame(
        heading(
          diff.changeCount === 0
            ? "No changes needed"
            : `${diff.changeCount} change${diff.changeCount === 1 ? "" : "s"}`,
        ),
        <Text>
          {diff.segments.map((s) =>
            s.kind === "same" ? (
              s.text
            ) : (
              <Text>
                {s.removed ? (
                  <Text color="error" strikethrough>
                    {s.removed}
                  </Text>
                ) : null}
                {s.added ? <Text color="success">{s.added}</Text> : null}
              </Text>
            ),
          )}
        </Text>,
        buttons([
          <Button
            key="replace"
            label="Replace"
            variant="primary"
            onPress={() => replace($)}
          />,
          <Button key="discard" label="Discard" onPress={() => reset($)} />,
        ]),
      );
    }

    if (r.phase === "asking") {
      return frame(
        heading("Answer what you can, then write the prompt"),
        ...r.questions.map((question, i) => (
          <Box key={`row${i}`} flexDirection="column" marginTop={1}>
            <Text>{question}</Text>
            <Input
              key={`q${i}`}
              placeholder="Your answer"
              value={r.answers[i] ?? ""}
              autoFocus={i === 0 ? true : undefined}
              onInput={(value) => setAnswer($, i, value)}
              onSubmit={(value) => setAnswer($, i, value)}
            />
          </Box>
        )),
        buttons([
          <Button
            key="compose"
            label="Write prompt"
            variant="primary"
            onPress={async () => {
              const cur = await read($, refine);
              if (cur.phase !== "asking") return;
              const answers = cur.questions.map((question, i) => ({
                question,
                answer: cur.answers[i] ?? "",
              }));
              await run($, "compose", cur.draft, answers);
            }}
          />,
          <Button key="discard" label="Cancel" onPress={() => reset($)} />,
        ]),
      );
    }

    if (r.phase === "applied") {
      return frame(
        heading("Prompt replaced"),
        buttons(<Button key="undo" label="Undo" onPress={() => undo($)} />),
      );
    }

    if (r.phase === "error") {
      return frame(
        heading(r.message, "error"),
        buttons(<Button key="dismiss" label="OK" onPress={() => reset($)} />),
      );
    }

    if (result === null) return next(e);
    const color =
      result.score >= 80 ? "success" : result.score >= 50 ? "warning" : "error";
    const [top] = result.findings;
    const startRefine = async (step: RefineStep) => {
      const box = await $.prompt.read();
      const draft = box.text.trim();
      if (draft) await run($, step, draft);
    };

    return frame(
      <Text>
        <Text color="claude" bold>
          plenz
        </Text>
        <Text color={color} bold>
          {"  "}
          {result.score}
        </Text>
        <Text dimColor>
          {"  "}
          {top ? result.findings.map((f) => f.label).join(" · ") : "Looks good"}
        </Text>
      </Text>,
      top ? <Text dimColor>{top.hint}</Text> : null,
      buttons(
        MODES.map((m, i) => (
          <Button
            key={m.step}
            label={m.label}
            variant={i === 0 ? "primary" : undefined}
            onPress={() => startRefine(m.step)}
          />
        )),
      ),
    );
  });
};
