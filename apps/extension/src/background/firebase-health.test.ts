import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  FIREBASE_RETRY_AFTER_MS,
  firebaseHealthTransition,
  shouldTryFirebase,
  type FirebaseHealth,
} from "./firebase-health.ts";

const available: FirebaseHealth = { kind: "available" };

describe("firebase health", () => {
  test("Firebase is tried while available", () => {
    assert.equal(shouldTryFirebase(available, 0), true);
  });

  test("a failure skips Firebase until the wait is over", () => {
    const down = firebaseHealthTransition(available, { type: "FAILED", error: "offline", now: 1000 });
    assert.deepEqual(down, {
      kind: "unavailable",
      retryAt: 1000 + FIREBASE_RETRY_AFTER_MS,
      error: "offline",
    });
    assert.equal(shouldTryFirebase(down, 1000 + FIREBASE_RETRY_AFTER_MS - 1), false);
    assert.equal(shouldTryFirebase(down, 1000 + FIREBASE_RETRY_AFTER_MS), true);
  });

  test("a failed retry starts a new wait", () => {
    const down = firebaseHealthTransition(available, { type: "FAILED", error: "a", now: 0 });
    const again = firebaseHealthTransition(down, {
      type: "FAILED",
      error: "b",
      now: FIREBASE_RETRY_AFTER_MS,
    });
    assert.equal(shouldTryFirebase(again, FIREBASE_RETRY_AFTER_MS + 1), false);
  });

  test("a success or reset makes it available again", () => {
    const down = firebaseHealthTransition(available, { type: "FAILED", error: "a", now: 0 });
    assert.deepEqual(firebaseHealthTransition(down, { type: "SUCCEEDED" }), available);
    assert.deepEqual(firebaseHealthTransition(down, { type: "RESET" }), available);
    assert.equal(firebaseHealthTransition(available, { type: "SUCCEEDED" }), available);
  });
});
