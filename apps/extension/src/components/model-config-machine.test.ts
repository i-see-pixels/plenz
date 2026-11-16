import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  backendNotice,
  backendTransition,
  FIREBASE_NOT_CONFIGURED_MESSAGE,
  saveBadgeStatus,
  saveMessage,
  saveTransition,
  testInputsKey,
  testTransition,
  visibleTestResult,
  type BackendEvent,
  type BackendState,
  type SaveState,
} from "./model-config-machine.ts";

describe("model config: save", () => {
  const idle: SaveState = { kind: "idle", syncStatus: "local-only" };

  test("saving shows progress, then where the config now lives", () => {
    const saving = saveTransition(idle, { type: "SAVE_STARTED" });
    assert.equal(saveBadgeStatus(saving), "syncing");
    const saved = saveTransition(saving, { type: "SAVE_SUCCEEDED", syncStatus: "synced" });
    assert.equal(saveBadgeStatus(saved), "synced");
  });

  test("a failed save shows the error; a fallback warning does not count as failure", () => {
    const failed = saveTransition({ kind: "saving" }, { type: "SAVE_FAILED", error: "quota" });
    assert.equal(saveBadgeStatus(failed), "error");
    assert.equal(saveMessage(failed), "quota");

    const warned = saveTransition(
      { kind: "saving" },
      { type: "SAVE_SUCCEEDED", syncStatus: "local-only", warning: "Firebase down" },
    );
    assert.equal(saveBadgeStatus(warned), "local-only");
    assert.equal(saveMessage(warned), "Firebase down");
  });

  test("a config reload does not interrupt a save in flight", () => {
    const saving: SaveState = { kind: "saving" };
    assert.equal(saveTransition(saving, { type: "CONFIG_LOADED", syncStatus: "synced" }), saving);
  });

  test("results without a save in flight are ignored", () => {
    assert.equal(saveTransition(idle, { type: "SAVE_SUCCEEDED", syncStatus: "synced" }), idle);
    assert.equal(saveTransition(idle, { type: "SAVE_FAILED", error: "x" }), idle);
  });
});

describe("model config: sync method", () => {
  const request = (
    overrides: Partial<Extract<BackendEvent, { type: "SWITCH_REQUESTED" }>> = {},
  ): BackendEvent => ({
    type: "SWITCH_REQUESTED",
    target: "firebase",
    current: "chrome-sync",
    isSignedIn: true,
    firebaseConfigured: true,
    vaultReady: true,
    ...overrides,
  });
  const idle: BackendState = { kind: "idle" };

  test("Cloud Sync is blocked until signed in and configured", () => {
    assert.deepEqual(backendTransition(idle, request({ isSignedIn: false })), {
      kind: "blocked",
      message: "Sign in with Google before enabling Cloud Sync.",
    });
    assert.deepEqual(backendTransition(idle, request({ firebaseConfigured: false })), {
      kind: "blocked",
      message: FIREBASE_NOT_CONFIGURED_MESSAGE,
    });
  });

  test("Cloud Sync waits for the sync passphrase to be set up and unlocked", () => {
    const blocked = backendTransition(idle, request({ vaultReady: false }));
    assert.equal(blocked.kind, "blocked");
    assert.match(backendNotice(blocked)!.message, /sync passphrase/);
    assert.equal(backendTransition(idle, request({ target: "chrome-sync", current: "firebase", vaultReady: false })).kind, "switching");
  });

  test("choosing the current method or clicking while switching does nothing", () => {
    assert.equal(backendTransition(idle, request({ target: "chrome-sync" })), idle);
    const switching: BackendState = { kind: "switching", target: "firebase" };
    assert.equal(backendTransition(switching, request({ target: "chrome-sync", current: "firebase" })), switching);
  });

  test("a switch reports migration results", () => {
    const switching = backendTransition(idle, request());
    assert.equal(backendNotice(switching)?.message, "Migrating saved provider settings to Cloud Sync...");

    const migrated = backendTransition(switching, {
      type: "SWITCH_SUCCEEDED",
      migration: { migrated: 2, errors: [] },
    });
    assert.deepEqual(backendNotice(migrated), {
      tone: "muted",
      message: "Cloud Sync enabled. Migrated 2 provider configurations from Chrome Sync.",
    });

    const warned = backendTransition(switching, {
      type: "SWITCH_SUCCEEDED",
      migration: { migrated: 1, errors: ["openai failed"] },
    });
    assert.deepEqual(backendNotice(warned), {
      tone: "error",
      message: "Cloud Sync enabled with warnings. openai failed",
    });
  });

  test("a failed switch shows the error; idle uses the default text", () => {
    const failed = backendTransition(
      { kind: "switching", target: "chrome-sync" },
      { type: "SWITCH_FAILED", message: "nope" },
    );
    assert.deepEqual(backendNotice(failed), { tone: "error", message: "nope" });
    assert.equal(backendNotice(idle), undefined);
  });
});

describe("model config: connection test", () => {
  const inputs = (apiKey: string) =>
    testInputsKey({ providerId: "openai", apiKey, model: "gpt", baseUrl: "" });
  const ok = { success: true, latencyMs: 120 };

  test("a result shows only for the inputs it was run with", () => {
    const testing = testTransition({ kind: "idle" }, { type: "TEST_STARTED", inputs: inputs("k1") });
    const done = testTransition(testing, { type: "TEST_FINISHED", inputs: inputs("k1"), result: ok });
    assert.deepEqual(visibleTestResult(done, inputs("k1")), ok);
    assert.equal(visibleTestResult(done, inputs("k2")), null);
  });

  test("a result for other inputs than the running test is dropped", () => {
    const testing = testTransition({ kind: "idle" }, { type: "TEST_STARTED", inputs: inputs("k2") });
    assert.equal(
      testTransition(testing, { type: "TEST_FINISHED", inputs: inputs("k1"), result: ok }),
      testing,
    );
  });
});
