import { AUTH_SESSION_ACTIVE_STORAGE_KEY, AuthManager } from "./auth";
import {
  authTransition,
  initialAuthState,
  isSettled,
  toSnapshot,
  type AuthEffect,
  type AuthEvent,
  type AuthSnapshot,
  type AuthState,
} from "./auth-machine";
import { StorageManager } from "./storage";
import { resetFirebaseHealth } from "./storage-backend";
import type { BroadcastMessage } from "../shared/rpc";

/**
 * Driver for the auth state machine (see ./auth-machine.ts). It runs the
 * effects each transition returns and broadcasts every change to all
 * extension pages as AUTH_STATE_CHANGED, so popup, options and side panel
 * stay in step without talking to each other.
 */

let state: AuthState = initialAuthState();
// Starts from the clock so versions keep growing across worker restarts.
let version = Date.now();
let settledWaiters: Array<() => void> = [];

function snapshot(): AuthSnapshot {
  return toSnapshot(state, version);
}

function dispatch(event: AuthEvent) {
  const result = authTransition(state, event);
  if (result.state === state) return;

  state = result.state;
  version++;
  const broadcast: BroadcastMessage = { type: "AUTH_STATE_CHANGED", payload: snapshot() };
  void chrome.runtime.sendMessage(broadcast).catch(() => {}); // No extension page is open.

  if (isSettled(state)) {
    const waiters = settledWaiters;
    settledWaiters = [];
    for (const resolve of waiters) resolve();
  }

  for (const effect of result.effects) {
    void perform(effect).then(dispatch);
  }
}

async function perform(effect: AuthEffect): Promise<AuthEvent> {
  switch (effect.type) {
    case "checkSession":
      return {
        type: "SESSION_CHECKED",
        user: await AuthManager.getAuthStatus().catch(() => null),
      };

    case "signIn": {
      const user = await AuthManager.signIn(true).catch(() => null);
      if (user) resetFirebaseHealth();
      return user
        ? { type: "SIGNED_IN", user }
        : { type: "SIGN_IN_FAILED", message: "Sign-in was cancelled or failed." };
    }

    case "syncKeys":
      try {
        const { errors } = await StorageManager.migrateLocalToPreferredBackend();
        if (errors.length) console.warn("plenz: key sync after sign-in:", errors);
      } catch (error) {
        console.warn("plenz: key sync after sign-in failed:", error);
      }
      return { type: "KEYS_SYNCED" };

    case "cacheKeys":
      try {
        const { errors } = await StorageManager.cacheSyncToLocal();
        if (errors.length) console.warn("plenz: caching keys before sign-out:", errors);
      } catch (error) {
        console.warn("plenz: caching keys before sign-out failed:", error);
      }
      return { type: "KEYS_CACHED" };

    case "signOut":
      return (await AuthManager.signOut().catch(() => false))
        ? { type: "SIGNED_OUT" }
        : { type: "SIGN_OUT_FAILED", message: "Sign-out failed. Try again." };
  }
}

function waitUntilSettled(): Promise<void> {
  if (state.kind === "unknown") dispatch({ type: "CHECK_REQUESTED" });
  if (isSettled(state)) return Promise.resolve();
  return new Promise((resolve) => settledWaiters.push(resolve));
}

// Storage calls re-validate the token and clear this flag when it is gone.
chrome.storage.onChanged.addListener((changes, areaName) => {
  const change = changes[AUTH_SESSION_ACTIVE_STORAGE_KEY];
  if (areaName === "local" && change && change.newValue !== true) {
    dispatch({ type: "SESSION_LOST" });
  }
});

export const AuthSession = {
  async getSnapshot(): Promise<AuthSnapshot> {
    await waitUntilSettled();
    return snapshot();
  },

  async signIn(): Promise<AuthSnapshot> {
    await waitUntilSettled();
    dispatch({ type: "SIGN_IN_REQUESTED" });
    await waitUntilSettled();
    return snapshot();
  },

  async signOut(keepLocalCopies: boolean): Promise<AuthSnapshot> {
    await waitUntilSettled();
    dispatch({ type: "SIGN_OUT_REQUESTED", keepLocalCopies });
    await waitUntilSettled();
    return snapshot();
  },
};
