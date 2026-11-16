import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  authTransition,
  initialAuthState,
  isSettled,
  toSnapshot,
  type AuthEffect,
  type AuthEvent,
  type AuthState,
  type AuthUser,
} from "./auth-machine.ts";

const USER: AuthUser = {
  id: "1",
  email: "a@example.com",
  name: "A",
  picture: "",
};

function run(state: AuthState, ...events: AuthEvent[]) {
  const effects: AuthEffect[] = [];
  for (const event of events) {
    const result = authTransition(state, event);
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
}

const signedOut = () =>
  run(initialAuthState(), { type: "CHECK_REQUESTED" }, { type: "SESSION_CHECKED", user: null }).state;

const signedIn = () =>
  run(initialAuthState(), { type: "CHECK_REQUESTED" }, { type: "SESSION_CHECKED", user: USER }).state;

describe("auth machine: checking", () => {
  test("starts unknown and checks the session on request", () => {
    const { state, effects } = run(initialAuthState(), { type: "CHECK_REQUESTED" });
    assert.deepEqual(state, { kind: "checking" });
    assert.deepEqual(effects, [{ type: "checkSession" }]);
  });

  test("the check settles signed in or signed out", () => {
    assert.deepEqual(signedIn(), { kind: "signedIn", user: USER });
    assert.deepEqual(signedOut(), { kind: "signedOut" });
  });

  test("only the first request checks; later ones do nothing", () => {
    for (const state of [
      signedIn(),
      signedOut(),
      run(signedOut(), { type: "SIGN_IN_REQUESTED" }).state,
      { kind: "checking" } as AuthState,
    ]) {
      assert.deepEqual(run(state, { type: "CHECK_REQUESTED" }), { state, effects: [] });
    }
  });
});

describe("auth machine: sign-in", () => {
  test("signs in, then moves local keys to sync before reporting signed in", () => {
    const requested = run(signedOut(), { type: "SIGN_IN_REQUESTED" });
    assert.deepEqual(requested.state, { kind: "signingIn" });
    assert.deepEqual(requested.effects, [{ type: "signIn" }]);

    const done = run(requested.state, { type: "SIGNED_IN", user: USER });
    assert.deepEqual(done.state, { kind: "syncingKeys", user: USER });
    assert.deepEqual(done.effects, [{ type: "syncKeys" }]);

    assert.deepEqual(run(done.state, { type: "KEYS_SYNCED" }).state, {
      kind: "signedIn",
      user: USER,
    });
  });

  test("a failed sign-in returns to signed out with the reason", () => {
    const { state } = run(
      signedOut(),
      { type: "SIGN_IN_REQUESTED" },
      { type: "SIGN_IN_FAILED", message: "cancelled" },
    );
    assert.deepEqual(state, { kind: "signedOut", error: "cancelled" });
  });

  test("a second sign-in click while one is running does nothing", () => {
    const signingIn = run(signedOut(), { type: "SIGN_IN_REQUESTED" }).state;
    assert.deepEqual(run(signingIn, { type: "SIGN_IN_REQUESTED" }).effects, []);
  });

  test("sign-in is ignored when already signed in", () => {
    const state = signedIn();
    assert.deepEqual(run(state, { type: "SIGN_IN_REQUESTED" }), { state, effects: [] });
  });
});

describe("auth machine: sign-out", () => {
  test("keeping local copies caches keys first, then signs out", () => {
    const requested = run(signedIn(), {
      type: "SIGN_OUT_REQUESTED",
      keepLocalCopies: true,
    });
    assert.deepEqual(requested.state, { kind: "cachingKeys", user: USER });
    assert.deepEqual(requested.effects, [{ type: "cacheKeys" }]);

    const cached = run(requested.state, { type: "KEYS_CACHED" });
    assert.deepEqual(cached.state, { kind: "signingOut", user: USER });
    assert.deepEqual(cached.effects, [{ type: "signOut" }]);

    assert.deepEqual(run(cached.state, { type: "SIGNED_OUT" }).state, {
      kind: "signedOut",
    });
  });

  test("not keeping local copies signs out straight away", () => {
    const { state, effects } = run(signedIn(), {
      type: "SIGN_OUT_REQUESTED",
      keepLocalCopies: false,
    });
    assert.deepEqual(state, { kind: "signingOut", user: USER });
    assert.deepEqual(effects, [{ type: "signOut" }]);
  });

  test("a failed sign-out stays signed in with the reason", () => {
    const { state } = run(
      signedIn(),
      { type: "SIGN_OUT_REQUESTED", keepLocalCopies: false },
      { type: "SIGN_OUT_FAILED", message: "storage error" },
    );
    assert.deepEqual(state, { kind: "signedIn", user: USER, error: "storage error" });
  });
});

describe("auth machine: lost session", () => {
  test("losing the session while idle signs out", () => {
    assert.deepEqual(run(signedIn(), { type: "SESSION_LOST" }).state, {
      kind: "signedOut",
    });
  });

  test("the session flag flipping during sign-in or sign-out is ignored", () => {
    const signingIn = run(signedOut(), { type: "SIGN_IN_REQUESTED" }).state;
    assert.equal(run(signingIn, { type: "SESSION_LOST" }).state, signingIn);

    const signingOut = run(signedIn(), {
      type: "SIGN_OUT_REQUESTED",
      keepLocalCopies: false,
    }).state;
    assert.equal(run(signingOut, { type: "SESSION_LOST" }).state, signingOut);
  });

  test("late results from a finished flow are dropped", () => {
    const state = signedIn();
    for (const event of [
      { type: "SESSION_CHECKED", user: null },
      { type: "SIGNED_IN", user: USER },
      { type: "KEYS_CACHED" },
      { type: "SIGNED_OUT" },
    ] as AuthEvent[]) {
      assert.equal(run(state, event).state, state);
    }
  });
});

describe("auth snapshot", () => {
  test("unknown shows as checking and busy states carry the user", () => {
    assert.deepEqual(toSnapshot(initialAuthState(), 1), {
      status: "checking",
      user: null,
      version: 1,
    });
    assert.deepEqual(toSnapshot({ kind: "signingOut", user: USER }, 2), {
      status: "signingOut",
      user: USER,
      version: 2,
    });
    assert.deepEqual(toSnapshot({ kind: "signedOut", error: "x" }, 3), {
      status: "signedOut",
      user: null,
      error: "x",
      version: 3,
    });
  });

  test("only signed in and signed out count as settled", () => {
    assert.equal(isSettled(signedIn()), true);
    assert.equal(isSettled(signedOut()), true);
    assert.equal(isSettled(initialAuthState()), false);
    assert.equal(isSettled({ kind: "checking" }), false);
  });
});
