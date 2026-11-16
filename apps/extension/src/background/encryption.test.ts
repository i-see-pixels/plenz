import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  fromFirestoreProviderConfig,
  isLegacyRecord,
  SyncLockedError,
  SyncPassphraseRequiredError,
  toFirestoreProviderConfig,
} from "./encryption.ts";
import { createVault, toBase64 } from "./vault-crypto.ts";

const UID = "user-1";
const CONFIG = { apiKey: "sk-live-123", model: "gpt-4o", baseUrl: undefined, maxTokens: undefined, temperature: undefined };

/** Exactly how pre-passphrase versions encrypted keys (SHA-256 of a fixed string + uid). */
async function legacyV1(apiKey: string, userId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`plenz/firebase-api-key/v1:${userId}`),
  );
  const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(apiKey));
  return { version: 1, alg: "AES-GCM", iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

const dataKey = async () => (await createVault("correct horse battery", 1_000)).dataKey;

describe("synced provider configs", () => {
  test("new records are end-to-end encrypted and read back with the data key", async () => {
    const key = await dataKey();
    const record = await toFirestoreProviderConfig(CONFIG, UID, "openai", key);
    assert.equal(record.apiKey, undefined);
    assert.ok(!JSON.stringify(record).includes("sk-live-123"));
    assert.equal(record.encryptedApiKey?.version, 2);

    const { config, migratedConfig } = await fromFirestoreProviderConfig(record, UID, "openai", key);
    assert.equal(config?.apiKey, "sk-live-123");
    assert.equal(config?.model, "gpt-4o");
    assert.equal(migratedConfig, null);
  });

  test("nothing is written without the data key", async () => {
    await assert.rejects(toFirestoreProviderConfig(CONFIG, UID, "openai", null), SyncPassphraseRequiredError);
  });

  test("a locked device can't read end-to-end encrypted records", async () => {
    const record = await toFirestoreProviderConfig(CONFIG, UID, "openai", await dataKey());
    await assert.rejects(fromFirestoreProviderConfig(record, UID, "openai", null), SyncLockedError);
  });

  test("a record moved to another provider's document won't decrypt", async () => {
    const key = await dataKey();
    const record = await toFirestoreProviderConfig(CONFIG, UID, "openai", key);
    await assert.rejects(fromFirestoreProviderConfig(record, UID, "anthropic", key));
  });

  test("old uid-encrypted records still read, and upgrade once the device is unlocked", async () => {
    const legacy = { model: "gpt-4o", encryptedApiKey: await legacyV1("sk-old", UID) };
    assert.equal(isLegacyRecord(legacy), true);

    const locked = await fromFirestoreProviderConfig(legacy, UID, "openai", null);
    assert.equal(locked.config?.apiKey, "sk-old");
    assert.equal(locked.migratedConfig, null);

    const key = await dataKey();
    const unlocked = await fromFirestoreProviderConfig(legacy, UID, "openai", key);
    assert.ok(unlocked.migratedConfig);
    assert.equal(isLegacyRecord(unlocked.migratedConfig), false);
    const reread = await fromFirestoreProviderConfig(unlocked.migratedConfig, UID, "openai", key);
    assert.equal(reread.config?.apiKey, "sk-old");
  });

  test("plaintext records from the oldest versions upgrade the same way", async () => {
    const plaintext = { apiKey: "sk-plain", model: "m" };
    assert.equal(isLegacyRecord(plaintext), true);
    const { config, migratedConfig } = await fromFirestoreProviderConfig(plaintext, UID, "groq", await dataKey());
    assert.equal(config?.apiKey, "sk-plain");
    assert.equal(migratedConfig?.apiKey, undefined);
    assert.ok(!JSON.stringify(migratedConfig).includes("sk-plain"));
  });

  test("unrecognised records are skipped", async () => {
    assert.deepEqual(await fromFirestoreProviderConfig({ model: "x" }, UID, "openai", null), {
      config: null,
      migratedConfig: null,
    });
    assert.equal(isLegacyRecord({ model: "x" }), false);
  });
});
