import type { On } from "claude-code";
import { expect, test } from "claude-code/testing";

import { checkDraft } from "../hooks/register";

const BAND = {
  plugin: "plenz",
  component: "AbovePrompt",
  requestId: "band",
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const;

const ids = (text: string) => checkDraft(text)?.findings.map((f) => f.id);

/** Seeds the two state values as an earlier session left them. */
function seed(on: On, values: { check?: unknown; refine?: unknown }) {
  on("state.get", (_, e) => {
    const value = (values as Record<string, unknown>)[e.key];
    return { value: { value, version: value === undefined ? 0 : 1 } };
  });
}

test("quiet for empty, short, slash, shell and memory drafts", async () => {
  for (const text of [
    "",
    "write",
    "write email",
    "/schedule a thing",
    "!ls -la",
    "# use British spelling",
  ]) {
    expect(checkDraft(text)).toBe(null);
  }
});

test("the extension rubric: a bare request is missing goal, format, audience, length, constraints", async () => {
  expect(ids("write a blog post about remote work")).toEqual([
    "no_goal",
    "no_audience",
    "no_length",
    "no_constraints",
  ]);
  expect(ids("write something about stuff for the newsletter")).toContain(
    "vague",
  );
});

test("the band shows the score, the chips, the hint and the four modes", async ($, on) => {
  seed(on, {
    check: {
      score: 45,
      findings: [
        { id: "no_format", label: "No output format", hint: "Name the shape." },
      ],
    },
  });
  for (const surface of ["terminal", "desktop"] as const) {
    const ui = await $.ui.mount({ ...BAND, surface });
    expect(await ui.find({ type: "Text", text: /45/ })).toBeDefined();
    expect(
      await ui.find({ type: "Text", text: /Name the shape/ }),
    ).toBeDefined();
    for (const key of ["improve", "tighten", "structure", "ask"]) {
      expect(await ui.find({ key })).toBeDefined();
    }
    await ui.unmount();
  }
});

test("a refined prompt shows its changes and Replace fills the box", async ($, on) => {
  seed(on, {
    refine: {
      phase: "ready",
      step: "improve",
      draft: "write a post",
      text: "write a short post for managers",
    },
  });
  let filled = "";
  on("prompt.fill", (_, e) => {
    filled = e.text;
    return { isFilled: true, box: { text: e.text, cursor: e.text.length } };
  });
  on("state.set", () => ({ value: { isSet: true, version: 2 } }));
  const ui = await $.ui.mount({ ...BAND, surface: "desktop" });
  expect(await ui.find({ type: "Text", text: /managers/ })).toBeDefined();
  await ui.press({ key: "replace" });
  expect(filled).toBe("write a short post for managers");
  await ui.unmount();
});

test("Ask me shows one field per question", async ($, on) => {
  seed(on, {
    refine: {
      phase: "asking",
      draft: "plan a trip",
      questions: ["Where to?", "How long?"],
      answers: ["", ""],
    },
  });
  const ui = await $.ui.mount({ ...BAND, surface: "desktop" });
  expect(await ui.find({ key: "q0" })).toBeDefined();
  expect(await ui.find({ key: "q1" })).toBeDefined();
  expect(await ui.find({ key: "compose" })).toBeDefined();
  await ui.unmount();
});
