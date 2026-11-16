// Pure state machine for one analysis request in the background worker.
// The active provider gets one attempt plus one retry when the failure is
// retryable; after that, configured fallback providers are tried in order
// (only when the user opted in, i.e. fallbackCount > 0).

export type AttemptTarget =
  | { kind: "active" }
  | { kind: "retry" }
  | { kind: "fallback"; index: number };

export type OrchestratorState<E = unknown> =
  | { kind: "attempting"; target: AttemptTarget; lastError?: E }
  | { kind: "succeeded" }
  | { kind: "failed"; error: E }
  | { kind: "cancelled" };

export type OrchestratorEvent<E = unknown> =
  | { type: "ATTEMPT_SUCCEEDED" }
  | { type: "ATTEMPT_FAILED"; error: E; retryable: boolean }
  | { type: "CANCELLED" };

export type OrchestratorContext = {
  /** Number of fallback providers available; 0 when fallback is off. */
  fallbackCount: number;
};

export function initialOrchestratorState<E>(): OrchestratorState<E> {
  return { kind: "attempting", target: { kind: "active" } };
}

function nextFallback<E>(
  index: number,
  error: E,
  ctx: OrchestratorContext,
): OrchestratorState<E> {
  return index < ctx.fallbackCount
    ? { kind: "attempting", target: { kind: "fallback", index }, lastError: error }
    : { kind: "failed", error };
}

export function orchestratorTransition<E>(
  state: OrchestratorState<E>,
  event: OrchestratorEvent<E>,
  ctx: OrchestratorContext,
): OrchestratorState<E> {
  // Terminal states absorb every event.
  if (state.kind !== "attempting") return state;

  switch (event.type) {
    case "ATTEMPT_SUCCEEDED":
      return { kind: "succeeded" };

    case "CANCELLED":
      return { kind: "cancelled" };

    case "ATTEMPT_FAILED": {
      const { target } = state;
      if (target.kind === "active") {
        return event.retryable
          ? { kind: "attempting", target: { kind: "retry" }, lastError: event.error }
          : nextFallback(0, event.error, ctx);
      }
      if (target.kind === "retry") {
        return nextFallback(0, event.error, ctx);
      }
      return nextFallback(target.index + 1, event.error, ctx);
    }
  }
}
