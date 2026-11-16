// Pure state for the model settings form (ModelConfig.tsx): saving a
// provider config, switching the sync method, and testing a connection.
// Each flow is its own small machine; the component only runs the I/O.

import type { ConnectionTestResult, SyncStatus } from "@plenz/types";

export type StorageBackendPreference = "chrome-sync" | "firebase";

// ---------------------------------------------------------------------------
// Save. Where the config lives (`syncStatus`) is kept apart from what the
// save is doing, so "local-only" no longer doubles as a save result.

export type SaveState =
  | { kind: "idle"; syncStatus: SyncStatus; warning?: string }
  | { kind: "saving" }
  | { kind: "failed"; error: string };

export type SaveEvent =
  | { type: "CONFIG_LOADED"; syncStatus: SyncStatus; warning?: string }
  | { type: "SAVE_STARTED" }
  | { type: "SAVE_SUCCEEDED"; syncStatus: SyncStatus; warning?: string }
  | { type: "SAVE_FAILED"; error: string };

export function saveTransition(state: SaveState, event: SaveEvent): SaveState {
  switch (event.type) {
    case "CONFIG_LOADED":
      // A save in flight decides the next state, not a background reload.
      return state.kind === "saving"
        ? state
        : { kind: "idle", syncStatus: event.syncStatus, warning: event.warning };
    case "SAVE_STARTED":
      return state.kind === "saving" ? state : { kind: "saving" };
    case "SAVE_SUCCEEDED":
      return state.kind === "saving"
        ? { kind: "idle", syncStatus: event.syncStatus, warning: event.warning }
        : state;
    case "SAVE_FAILED":
      return state.kind === "saving" ? { kind: "failed", error: event.error } : state;
  }
}

/** The status badge: progress while saving, otherwise where the config lives. */
export function saveBadgeStatus(state: SaveState): SyncStatus {
  if (state.kind === "saving") return "syncing";
  if (state.kind === "failed") return "error";
  return state.syncStatus;
}

export function saveMessage(state: SaveState): string | undefined {
  if (state.kind === "failed") return state.error;
  if (state.kind === "idle") return state.warning;
  return undefined;
}

// ---------------------------------------------------------------------------
// Sync method switch.

export type MigrationResult = { migrated: number; errors: string[] };

export type BackendState =
  | { kind: "idle" }
  | { kind: "blocked"; message: string }
  | { kind: "switching"; target: StorageBackendPreference }
  | { kind: "switched"; message: string; warning: boolean }
  | { kind: "failed"; message: string };

export type BackendEvent =
  | {
      type: "SWITCH_REQUESTED";
      target: StorageBackendPreference;
      current: StorageBackendPreference;
      isSignedIn: boolean;
      firebaseConfigured: boolean;
      /** The sync passphrase is set up and unlocked on this device. */
      vaultReady: boolean;
    }
  | { type: "SWITCH_SUCCEEDED"; migration: MigrationResult | null }
  | { type: "SWITCH_FAILED"; message: string }
  | { type: "SETTINGS_LOAD_FAILED"; message: string };

export const FIREBASE_NOT_CONFIGURED_MESSAGE =
  "Firebase is not configured in this build. Add the VITE_FIREBASE_* environment variables before enabling Cloud Sync.";

function switchedMessage(
  target: StorageBackendPreference,
  migration: MigrationResult | null,
) {
  if (target === "chrome-sync") {
    return "Chrome Sync enabled. Existing Cloud Sync data remains available if you switch back.";
  }
  if (migration?.errors.length) {
    return `Cloud Sync enabled with warnings. ${migration.errors[0]}`;
  }
  if (migration && migration.migrated > 0) {
    const plural = migration.migrated === 1 ? "" : "s";
    return `Cloud Sync enabled. Migrated ${migration.migrated} provider configuration${plural} from Chrome Sync.`;
  }
  return "Cloud Sync enabled.";
}

export function backendTransition(
  state: BackendState,
  event: BackendEvent,
): BackendState {
  switch (event.type) {
    case "SWITCH_REQUESTED":
      if (state.kind === "switching" || event.target === event.current) return state;
      if (event.target === "firebase" && !event.isSignedIn) {
        return { kind: "blocked", message: "Sign in with Google before enabling Cloud Sync." };
      }
      if (event.target === "firebase" && !event.firebaseConfigured) {
        return { kind: "blocked", message: FIREBASE_NOT_CONFIGURED_MESSAGE };
      }
      if (event.target === "firebase" && !event.vaultReady) {
        return {
          kind: "blocked",
          message: "Set up or unlock your sync passphrase below before switching to Cloud Sync.",
        };
      }
      return { kind: "switching", target: event.target };

    case "SWITCH_SUCCEEDED":
      return state.kind === "switching"
        ? {
            kind: "switched",
            message: switchedMessage(state.target, event.migration),
            warning: state.target === "firebase" && !!event.migration?.errors.length,
          }
        : state;

    case "SWITCH_FAILED":
      return state.kind === "switching" ? { kind: "failed", message: event.message } : state;

    case "SETTINGS_LOAD_FAILED":
      return state.kind === "switching" ? state : { kind: "failed", message: event.message };
  }
}

/** The line under the sync method buttons; undefined means "use the default text". */
export function backendNotice(
  state: BackendState,
): { tone: "muted" | "error"; message: string } | undefined {
  switch (state.kind) {
    case "idle":
      return undefined;
    case "switching":
      return {
        tone: "muted",
        message:
          state.target === "firebase"
            ? "Migrating saved provider settings to Cloud Sync..."
            : "Switching to Chrome Sync...",
      };
    case "switched":
      return { tone: state.warning ? "error" : "muted", message: state.message };
    case "blocked":
    case "failed":
      return { tone: "error", message: state.message };
  }
}

// ---------------------------------------------------------------------------
// Connection test. Results are tagged with the inputs they were run for, so a
// result never shows next to a different provider, model, key or URL.

export type TestState =
  | { kind: "idle" }
  | { kind: "testing"; inputs: string }
  | { kind: "done"; inputs: string; result: ConnectionTestResult };

export type TestEvent =
  | { type: "TEST_STARTED"; inputs: string }
  | { type: "TEST_FINISHED"; inputs: string; result: ConnectionTestResult };

export function testInputsKey(inputs: {
  providerId: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}) {
  return JSON.stringify([inputs.providerId, inputs.apiKey, inputs.model, inputs.baseUrl]);
}

export function testTransition(state: TestState, event: TestEvent): TestState {
  switch (event.type) {
    case "TEST_STARTED":
      return state.kind === "testing" ? state : { kind: "testing", inputs: event.inputs };
    case "TEST_FINISHED":
      return state.kind === "testing" && state.inputs === event.inputs
        ? { kind: "done", inputs: event.inputs, result: event.result }
        : state;
  }
}

export function visibleTestResult(state: TestState, currentInputs: string) {
  return state.kind === "done" && state.inputs === currentInputs ? state.result : null;
}
