import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  EMPTY_DRAFT,
  promptModalTransition,
  type PromptModalEvent,
  type PromptModalState,
} from "./prompt-modal-machine.ts";

function run(state: PromptModalState, ...events: PromptModalEvent[]) {
  for (const event of events) state = promptModalTransition(state, event);
  return state;
}

const closed: PromptModalState = { kind: "closed" };
const open = (): PromptModalState =>
  run(closed, { type: "OPEN", mode: "create", draft: EMPTY_DRAFT });

describe("prompt modal", () => {
  test("opens with a draft and edits it", () => {
    const state = run(
      open(),
      { type: "EDIT", field: "title", value: "Launch" },
      { type: "EDIT", field: "prompt", value: "Write a post" },
    );
    assert.deepEqual(state, {
      kind: "editing",
      mode: "create",
      draft: { savedPromptId: null, title: "Launch", prompt: "Write a post" },
    });
  });

  test("a successful submit closes it", () => {
    assert.deepEqual(run(open(), { type: "SUBMIT" }, { type: "SUBMIT_SUCCEEDED" }), closed);
  });

  test("a failed submit goes back to editing with the draft kept", () => {
    const edited = run(open(), { type: "EDIT", field: "title", value: "Keep me" });
    const failed = run(edited, { type: "SUBMIT" }, { type: "SUBMIT_FAILED" });
    assert.deepEqual(failed, edited);
  });

  test("while submitting it cannot be closed, reopened, edited or resubmitted", () => {
    const submitting = run(open(), { type: "SUBMIT" });
    for (const event of [
      { type: "CLOSE" },
      { type: "OPEN", mode: "edit", draft: EMPTY_DRAFT },
      { type: "EDIT", field: "title", value: "x" },
      { type: "SUBMIT" },
    ] as PromptModalEvent[]) {
      assert.equal(promptModalTransition(submitting, event), submitting);
    }
  });

  test("closing discards the draft; results for a closed dialog are ignored", () => {
    assert.deepEqual(run(open(), { type: "CLOSE" }), closed);
    assert.equal(promptModalTransition(closed, { type: "SUBMIT_SUCCEEDED" }), closed);
    assert.equal(promptModalTransition(closed, { type: "EDIT", field: "title", value: "x" }), closed);
  });
});
