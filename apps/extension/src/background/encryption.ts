import type { ProviderConfig } from "@plenz/types";
import {
  decryptSecret,
  encryptSecret,
  fromBase64,
  isEncryptedSecret,
  secretContext,
  type EncryptedSecret,
} from "./vault-crypto.ts";

/**
 * Before passphrase sync, keys were encrypted with SHA-256 of a fixed string
 * plus the uid. The uid is the document path, so anyone who could read the
 * document could decrypt it. Read-only now: such keys are re-encrypted with
 * the vault's data key as soon as this device is unlocked.
 */
type LegacyEncryptedApiKey = { version: 1; alg: "AES-GCM"; iv: string; ciphertext: string };

export interface FirestoreProviderConfig extends Omit<ProviderConfig, "apiKey"> {
  /** Plaintext, from the oldest versions. Read-only; replaced on upgrade. */
  apiKey?: string;
  encryptedApiKey?: EncryptedSecret | LegacyEncryptedApiKey;
}

export class SyncLockedError extends Error {
  constructor() {
    super("Cloud Sync is locked on this device. Enter your sync passphrase in plenz settings.");
    this.name = "SyncLockedError";
  }
}

export class SyncPassphraseRequiredError extends Error {
  constructor() {
    super("Set a sync passphrase in plenz settings before saving keys to Cloud Sync.");
    this.name = "SyncPassphraseRequiredError";
  }
}

/** Vault states are not outages: callers must not fall back or back off. */
export function isVaultError(error: unknown) {
  return error instanceof SyncLockedError || error instanceof SyncPassphraseRequiredError;
}

function isLegacyPayload(value: unknown): value is LegacyEncryptedApiKey {
  const v = value as LegacyEncryptedApiKey;
  return !!v && v.version === 1 && v.alg === "AES-GCM" && typeof v.iv === "string";
}

async function decryptLegacyApiKey(payload: LegacyEncryptedApiKey, userId: string) {
  const material = new TextEncoder().encode(`plenz/firebase-api-key/v1:${userId}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

/** Needs the unlocked data key: nothing weaker is written any more. */
export async function toFirestoreProviderConfig(
  config: ProviderConfig,
  userId: string,
  providerId: string,
  dataKey: CryptoKey | null,
): Promise<FirestoreProviderConfig> {
  if (!dataKey) throw new SyncPassphraseRequiredError();
  const { apiKey, ...rest } = config;
  return {
    ...rest,
    encryptedApiKey: await encryptSecret(dataKey, apiKey, secretContext(userId, providerId)),
  };
}

/**
 * Reads any stored format. Legacy formats come back with `migratedConfig` (the
 * same config, end-to-end encrypted) when the device is unlocked, so the
 * caller can rewrite the document.
 */
export async function fromFirestoreProviderConfig(
  value: unknown,
  userId: string,
  providerId: string,
  dataKey: CryptoKey | null,
): Promise<{ config: ProviderConfig | null; migratedConfig: FirestoreProviderConfig | null }> {
  if (!value || typeof value !== "object") return { config: null, migratedConfig: null };

  const record = value as FirestoreProviderConfig;
  const withKey = (apiKey: string): ProviderConfig => ({
    apiKey,
    model: typeof record.model === "string" ? record.model : "",
    baseUrl: record.baseUrl,
    maxTokens: record.maxTokens,
    temperature: record.temperature,
  });

  if (isEncryptedSecret(record.encryptedApiKey)) {
    if (!dataKey) throw new SyncLockedError();
    const apiKey = await decryptSecret(
      dataKey,
      record.encryptedApiKey,
      secretContext(userId, providerId),
    );
    return { config: withKey(apiKey), migratedConfig: null };
  }

  let legacyKey: string | null = null;
  if (isLegacyPayload(record.encryptedApiKey)) {
    legacyKey = await decryptLegacyApiKey(record.encryptedApiKey, userId);
  } else if (typeof record.apiKey === "string") {
    legacyKey = record.apiKey;
  }
  if (legacyKey === null) return { config: null, migratedConfig: null };

  const config = withKey(legacyKey);
  return {
    config,
    migratedConfig: dataKey
      ? await toFirestoreProviderConfig(config, userId, providerId, dataKey)
      : null,
  };
}

/** True when the record still uses a pre-passphrase format. */
export function isLegacyRecord(value: unknown) {
  const record = value as FirestoreProviderConfig;
  return (
    !!record &&
    !isEncryptedSecret(record.encryptedApiKey) &&
    (isLegacyPayload(record.encryptedApiKey) || typeof record.apiKey === "string")
  );
}
