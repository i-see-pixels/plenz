import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  initialOrchestratorState,
  type OrchestratorEvent,
  type OrchestratorState,
  orchestratorTransition,
} from "./orchestrator-machine.ts";

const fail = (error: string, retryable = false): OrchestratorEvent<string> => ({
  type: "ATTEMPT_FAILED",
  error,
  retryable,
});

function run(fallbackCount: number, ...events: OrchestratorEvent<string>[]) {
  let state: OrchestratorState<string> = initialOrchestratorState<string>();
  const targets: string[] = [];
  for (const event of events) {
    if (state.kind === "attempting") {
      const t = state.target;
      targets.push(t.kind === "fallback" ? `fallback:${t.index}` : t.kind);
    }
    state = orchestratorTransition(state, event, { fallbackCount });
  }
  return { state, targets };
}

describe("orchestrator machine", () => {
  test("first attempt succeeding ends the request", () => {
    const { state, targets } = run(2, { type: "ATTEMPT_SUCCEEDED" });
    assert.deepEqual(state, { kind: "succeeded" });
    assert.deepEqual(targets, ["active"]);
  });

  test("a retryable failure retries the active provider once", () => {
    const { state, targets } = run(0, fail("timeout", true), {
      type: "ATTEMPT_SUCCEEDED",
    });
    assert.deepEqual(state, { kind: "succeeded" });
    assert.deepEqual(targets, ["active", "retry"]);
  });

  test("with fallback off, failures end at the active provider", () => {
    assert.deepEqual(run(0, fail("bad key")).state, {
      kind: "failed",
      error: "bad key",
    });
    assert.deepEqual(
      run(0, fail("timeout", true), fail("timeout again", true)).state,
      {
        kind: "failed",
        error: "timeout again",
      },
    );
  });

  test("with fallback on, each fallback is tried in order", () => {
    const { state, targets } = run(
      2,
      fail("timeout", true),
      fail("timeout", true),
      fail("500", true),
      fail("401"),
    );
    assert.deepEqual(state, { kind: "failed", error: "401" });
    assert.deepEqual(targets, ["active", "retry", "fallback:0", "fallback:1"]);
  });

  test("a non-retryable failure skips the retry", () => {
    const { targets } = run(1, fail("invalid json"), {
      type: "ATTEMPT_SUCCEEDED",
    });
    assert.deepEqual(targets, ["active", "fallback:0"]);
  });

  test("cancelling stops at any attempt and is terminal", () => {
    const { state, targets } = run(
      2,
      fail("timeout", true),
      { type: "CANCELLED" },
      { type: "ATTEMPT_SUCCEEDED" },
    );
    assert.deepEqual(state, { kind: "cancelled" });
    assert.deepEqual(targets, ["active", "retry"]);
  });
});
