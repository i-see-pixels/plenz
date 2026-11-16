// Pure state for whether Cloud Sync (Firebase) is worth trying right now.
// After a failure, storage skips Firebase for a short while and uses the
// Chrome Sync fallback directly, instead of waiting on a failing call
// for every read (each prompt analysis reads the active config).

export const FIREBASE_RETRY_AFTER_MS = 30_000;

export type FirebaseHealth =
  | { kind: "available" }
  | { kind: "unavailable"; retryAt: number; error: string };

export type FirebaseHealthEvent =
  | { type: "SUCCEEDED" }
  | { type: "FAILED"; error: string; now: number }
  | { type: "RESET" };

export function firebaseHealthTransition(
  state: FirebaseHealth,
  event: FirebaseHealthEvent,
): FirebaseHealth {
  switch (event.type) {
    case "SUCCEEDED":
    case "RESET":
      return state.kind === "available" ? state : { kind: "available" };
    case "FAILED":
      return {
        kind: "unavailable",
        retryAt: event.now + FIREBASE_RETRY_AFTER_MS,
        error: event.error,
      };
  }
}

/** Once the wait is over, one call goes through to test Firebase again. */
export function shouldTryFirebase(state: FirebaseHealth, now: number) {
  return state.kind === "available" || now >= state.retryAt;
}
