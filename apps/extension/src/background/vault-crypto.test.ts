import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  changePassphrase,
  createVault,
  decryptSecret,
  encryptSecret,
  exportDataKey,
  importDataKey,
  isVaultRecord,
  secretContext,
  unlockVault,
  WrongPassphraseError,
} from "./vault-crypto.ts";

// Fast KDF for tests; production uses PBKDF2_ITERATIONS.
const ITER = 1_000;
const PASS = "correct horse battery";

describe("sync vault", () => {
  test("the stored vault contains no passphrase or raw key material", async () => {
    const { vault, dataKey } = await createVault(PASS, ITER);
    assert.ok(isVaultRecord(vault));
    const raw = Buffer.from(await exportDataKey(dataKey)).toString("base64");
    const stored = JSON.stringify(vault);
    assert.ok(!stored.includes(PASS));
    assert.ok(!stored.includes(raw));
  });

  test("the right passphrase unlocks the same data key", async () => {
    const { vault, dataKey } = await createVault(PASS, ITER);
    const unlocked = await unlockVault(vault, PASS);
    assert.deepEqual(await exportDataKey(unlocked), await exportDataKey(dataKey));
  });

  test("a wrong passphrase is rejected", async () => {
    const { vault } = await createVault(PASS, ITER);
    await assert.rejects(unlockVault(vault, "correct horse battery!"), WrongPassphraseError);
  });

  test("short passphrases are refused", async () => {
    await assert.rejects(createVault("short", ITER), /at least 10/);
  });

  test("changing the passphrase keeps the data key, so existing secrets still decrypt", async () => {
    const { vault, dataKey } = await createVault(PASS, ITER);
    const secret = await encryptSecret(dataKey, "sk-live-123", secretContext("u1", "openai"));
    const changed = await changePassphrase(vault, PASS, "a brand new passphrase", ITER);

    await assert.rejects(unlockVault(changed, PASS), WrongPassphraseError);
    const unlocked = await unlockVault(changed, "a brand new passphrase");
    assert.equal(await decryptSecret(unlocked, secret, secretContext("u1", "openai")), "sk-live-123");
    assert.notEqual(changed.kdf.salt, vault.kdf.salt);
  });

  test("changing needs the current passphrase", async () => {
    const { vault } = await createVault(PASS, ITER);
    await assert.rejects(changePassphrase(vault, "not it at all", "another long one", ITER), WrongPassphraseError);
  });

  test("a secret only decrypts for the account and provider it was stored under", async () => {
    const { dataKey } = await createVault(PASS, ITER);
    const secret = await encryptSecret(dataKey, "sk-live-123", secretContext("u1", "openai"));
    assert.equal(await decryptSecret(dataKey, secret, secretContext("u1", "openai")), "sk-live-123");
    await assert.rejects(decryptSecret(dataKey, secret, secretContext("u1", "anthropic")));
    await assert.rejects(decryptSecret(dataKey, secret, secretContext("u2", "openai")));
  });

  test("the same key encrypts differently each time", async () => {
    const { dataKey } = await createVault(PASS, ITER);
    const a = await encryptSecret(dataKey, "sk", "ctx");
    const b = await encryptSecret(dataKey, "sk", "ctx");
    assert.notEqual(a.iv, b.iv);
    assert.notEqual(a.ciphertext, b.ciphertext);
  });

  test("a data key survives export and import (how an unlocked device remembers it)", async () => {
    const { dataKey } = await createVault(PASS, ITER);
    const secret = await encryptSecret(dataKey, "sk", "ctx");
    const restored = await importDataKey(await exportDataKey(dataKey));
    assert.equal(await decryptSecret(restored, secret, "ctx"), "sk");
  });
});
