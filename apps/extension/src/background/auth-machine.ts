// Pure state machine for the Google sign-in session, owned by the background
// worker. Every extension page reads the same snapshot of it (see
// auth-session.ts), so there is one source of truth for "who is signed in".

import type { UserInfo } from "./auth";

export type AuthUser = UserInfo;

export type AuthState =
  | { kind: "unknown" } // worker just started; session not checked yet
  | { kind: "checking" }
  | { kind: "signedOut"; error?: string }
  | { kind: "signingIn" }
  | { kind: "syncingKeys"; user: AuthUser } // moving local keys to the sync backend
  | { kind: "signedIn"; user: AuthUser; error?: string }
  | { kind: "cachingKeys"; user: AuthUser } // keeping local copies before sign-out
  | { kind: "signingOut"; user: AuthUser };

export type AuthEvent =
  | { type: "CHECK_REQUESTED" }
  | { type: "SESSION_CHECKED"; user: AuthUser | null }
  | { type: "SIGN_IN_REQUESTED" }
  | { type: "SIGNED_IN"; user: AuthUser }
  | { type: "SIGN_IN_FAILED"; message: string }
  | { type: "KEYS_SYNCED" }
  | { type: "SIGN_OUT_REQUESTED"; keepLocalCopies: boolean }
  | { type: "KEYS_CACHED" }
  | { type: "SIGNED_OUT" }
  | { type: "SIGN_OUT_FAILED"; message: string }
  | { type: "SESSION_LOST" };

export type AuthEffect =
  | { type: "checkSession" }
  | { type: "signIn" }
  | { type: "syncKeys" }
  | { type: "cacheKeys" }
  | { type: "signOut" };

export type AuthStatus =
  | "checking"
  | "signedOut"
  | "signingIn"
  | "syncingKeys"
  | "signedIn"
  | "cachingKeys"
  | "signingOut";

/** What extension pages see. `version` only grows, so pages can drop stale copies. */
export type AuthSnapshot = {
  status: AuthStatus;
  user: AuthUser | null;
  error?: string;
  version: number;
};

export function initialAuthState(): AuthState {
  return { kind: "unknown" };
}

/** Signed in or out, with nothing in progress. */
export function isSettled(state: AuthState) {
  return state.kind === "signedIn" || state.kind === "signedOut";
}

export function authTransition(
  state: AuthState,
  event: AuthEvent,
): { state: AuthState; effects: AuthEffect[] } {
  const stay = { state, effects: [] };

  switch (event.type) {
    case "CHECK_REQUESTED":
      // Once settled, the session stays current through SESSION_LOST.
      return state.kind === "unknown"
        ? { state: { kind: "checking" }, effects: [{ type: "checkSession" }] }
        : stay;

    case "SESSION_CHECKED":
      if (state.kind !== "checking") return stay;
      return {
        state: event.user
          ? { kind: "signedIn", user: event.user }
          : { kind: "signedOut" },
        effects: [],
      };

    case "SIGN_IN_REQUESTED":
      return state.kind === "signedOut"
        ? { state: { kind: "signingIn" }, effects: [{ type: "signIn" }] }
        : stay;

    case "SIGNED_IN":
      return state.kind === "signingIn"
        ? {
            state: { kind: "syncingKeys", user: event.user },
            effects: [{ type: "syncKeys" }],
          }
        : stay;

    case "SIGN_IN_FAILED":
      return state.kind === "signingIn"
        ? { state: { kind: "signedOut", error: event.message }, effects: [] }
        : stay;

    case "KEYS_SYNCED":
      return state.kind === "syncingKeys"
        ? { state: { kind: "signedIn", user: state.user }, effects: [] }
        : stay;

    case "SIGN_OUT_REQUESTED":
      if (state.kind !== "signedIn") return stay;
      return event.keepLocalCopies
        ? {
            state: { kind: "cachingKeys", user: state.user },
            effects: [{ type: "cacheKeys" }],
          }
        : {
            state: { kind: "signingOut", user: state.user },
            effects: [{ type: "signOut" }],
          };

    case "KEYS_CACHED":
      return state.kind === "cachingKeys"
        ? {
            state: { kind: "signingOut", user: state.user },
            effects: [{ type: "signOut" }],
          }
        : stay;

    case "SIGNED_OUT":
      return state.kind === "signingOut"
        ? { state: { kind: "signedOut" }, effects: [] }
        : stay;

    case "SIGN_OUT_FAILED":
      return state.kind === "signingOut"
        ? {
            state: { kind: "signedIn", user: state.user, error: event.message },
            effects: [],
          }
        : stay;

    case "SESSION_LOST":
      // Only meaningful while idle and signed in; during sign-in or sign-out
      // the session flag changes as part of the flow itself.
      return state.kind === "signedIn"
        ? { state: { kind: "signedOut" }, effects: [] }
        : stay;
  }
}

export function toSnapshot(state: AuthState, version: number): AuthSnapshot {
  const status: AuthStatus = state.kind === "unknown" ? "checking" : state.kind;
  const user = "user" in state ? state.user : null;
  const error = "error" in state ? state.error : undefined;
  return error ? { status, user, error, version } : { status, user, version };
}
