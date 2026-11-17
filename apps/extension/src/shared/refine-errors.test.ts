import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { describeRefineError } from "./refine-errors.ts";

const kind = (status: number | undefined, message: string, online = true) =>
  describeRefineError({ status, message }, { online }).kind;

describe("describeRefineError", () => {
  test("classifies by status and provider wording", () => {
    assert.equal(kind(401, "Incorrect API key provided: sk-abc"), "auth");
    assert.equal(kind(400, "API key not valid. Please pass a valid API key."), "auth");
    assert.equal(kind(429, "Rate limit reached"), "rate_limit");
    assert.equal(kind(400, "You exceeded your current quota"), "rate_limit");
    assert.equal(kind(404, "The model `gpt-9` does not exist"), "model");
    assert.equal(kind(400, "This model's maximum context length is 8192 tokens"), "too_long");
    assert.equal(kind(503, "Overloaded"), "server");
    assert.equal(kind(undefined, "The provider timed out before the first token."), "timeout");
    assert.equal(kind(undefined, "Failed to fetch"), "network");
    assert.equal(kind(undefined, "Failed to fetch", false), "offline");
    assert.equal(kind(400, "Something odd"), "other");
  });

  test("settings fixes are flagged; transient ones are not", () => {
    assert.equal(describeRefineError({ status: 401, message: "x" }).fixInSettings, true);
    assert.equal(describeRefineError({ message: "Failed to fetch" }).fixInSettings, true);
    assert.equal(describeRefineError({ status: 429, message: "x" }).fixInSettings, false);
  });

  test("keeps the provider's wording as detail, but not a bare network error", () => {
    const auth = describeRefineError({ status: 401, message: "Incorrect API key provided" });
    assert.match(auth.message, /rejected the API key/);
    assert.equal(auth.detail, "401: Incorrect API key provided");
    assert.equal(describeRefineError({ message: "Failed to fetch" }).detail, undefined);
    assert.equal(describeRefineError({ message: "x".repeat(500), status: 500 }).detail?.length, 200);
  });

  test("unrecognized errors show their own message", () => {
    const other = describeRefineError({ message: "No clarifying questions came back. Try another mode." });
    assert.equal(other.message, "No clarifying questions came back. Try another mode.");
    assert.equal(other.detail, undefined);
  });

  test("setup errors keep plenz's own message", () => {
    const setup = describeRefineError(
      { message: "Cloud Sync is locked. Enter your sync passphrase in settings." },
      { setup: true },
    );
    assert.deepEqual(setup, {
      kind: "setup",
      message: "Cloud Sync is locked. Enter your sync passphrase in settings.",
      fixInSettings: true,
    });
  });
});
