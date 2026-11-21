import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildRefineRequest,
  cleanRefineOutput,
  parseClarifyingQuestions,
} from "./refine.ts";

const DRAFT = "write a launch email for our analytics feature";

describe("buildRefineRequest", () => {
  test("every mode keeps the shared rules and wraps the draft", () => {
    for (const step of [
      "improve",
      "tighten",
      "structure",
      "ask",
      "compose",
    ] as const) {
      const request = buildRefineRequest({ step, draft: DRAFT });
      assert.match(request.system, /Never answer, perform or comment/);
      assert.match(request.user, /<draft>\nwrite a launch email/);
      assert.ok(request.maxTokens > 0);
    }
  });

  test("each mode has its own goal", () => {
    assert.match(
      buildRefineRequest({ step: "tighten", draft: DRAFT }).system,
      /shorter/,
    );
    assert.match(
      buildRefineRequest({ step: "structure", draft: DRAFT }).system,
      /sections/,
    );
    assert.match(
      buildRefineRequest({ step: "ask", draft: DRAFT }).system,
      /one question per line/,
    );
  });

  test("improve passes the linter's findings; other modes don't", () => {
    const missing = ["No output format", "No audience or tone"];
    assert.match(
      buildRefineRequest({ step: "improve", draft: DRAFT, missing }).user,
      /may be missing: No output format, No audience or tone/,
    );
    assert.doesNotMatch(
      buildRefineRequest({ step: "tighten", draft: DRAFT, missing }).user,
      /may be missing/,
    );
  });

  test("compose includes the answers, marking blanks", () => {
    const { user } = buildRefineRequest({
      step: "compose",
      draft: DRAFT,
      answers: [
        { question: "Who is it for?", answer: "existing customers" },
        { question: "How long?", answer: "  " },
      ],
    });
    assert.match(user, /Q: Who is it for\?\nA: existing customers/);
    assert.match(user, /Q: How long\?\nA: \(no answer\)/);
  });

  test("chat context is included when given", () => {
    const { user } = buildRefineRequest({
      step: "improve",
      draft: DRAFT,
      context: {
        active_website: "chatgpt.com",
        conversation: {
          platform: "chatgpt",
          activeWebsite: "chatgpt.com",
          recentMessages: [{ role: "user", text: "we ship on Monday" }],
          tokenEstimate: 10,
          truncated: false,
        },
      },
    });
    assert.match(
      user,
      /<chat_context>[\s\S]*Website: chatgpt\.com[\s\S]*\[user\] we ship on Monday/,
    );
  });
});

describe("cleanRefineOutput", () => {
  test("strips a lead-in, a whole-reply fence and wrapping quotes", () => {
    assert.equal(
      cleanRefineOutput("Here's the improved prompt:\n\nWrite a launch email."),
      "Write a launch email.",
    );
    assert.equal(
      cleanRefineOutput("```markdown\n## Task\nWrite it.\n```"),
      "## Task\nWrite it.",
    );
    assert.equal(
      cleanRefineOutput('"Write a launch email."'),
      "Write a launch email.",
    );
  });

  test("leaves real content alone", () => {
    const withCode = "Fix this:\n```js\nconst x = 1\n```\nKeep the API.";
    assert.equal(cleanRefineOutput(withCode), withCode);
    const quotes = 'Say "hello" and "bye"';
    assert.equal(cleanRefineOutput(quotes), quotes);
  });
});

describe("parseClarifyingQuestions", () => {
  test("one question per line, without numbering, at most three", () => {
    assert.deepEqual(
      parseClarifyingQuestions(
        "1. Who is it for?\n\n- How long?\n* What tone?\n4) Any deadline?",
      ),
      ["Who is it for?", "How long?", "What tone?"],
    );
  });

  test("blank replies give no questions", () => {
    assert.deepEqual(parseClarifyingQuestions("\n  \n"), []);
  });
});
