import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { setupState } from "./setup.ts";

describe("setupState", () => {
  test("a configured provider is ready whatever the on-device model says", () => {
    assert.equal(setupState(true, null), "provider");
    assert.equal(setupState(true, "unavailable"), "provider");
  });

  test("without a provider, a ready on-device model is enough", () => {
    assert.equal(setupState(false, "available"), "on-device");
  });

  test("needs setup when neither works, including a model still downloading", () => {
    assert.equal(setupState(false, "unavailable"), "needs-setup");
    assert.equal(setupState(false, "downloadable"), "needs-setup");
    assert.equal(setupState(false, "downloading"), "needs-setup");
  });

  test("still checking until both answers are in", () => {
    assert.equal(setupState(null, "available"), "checking");
    assert.equal(setupState(false, null), "checking");
  });
});
