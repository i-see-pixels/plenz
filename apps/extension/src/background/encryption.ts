import type { ProviderConfig } from "@promptlens/types";

const ENCRYPTION_VERSION = 1;
const ENCRYPTION_ALGORITHM = "AES-GCM";
const KEY_DERIVATION_CONTEXT = "promptlens/firebase-api-key/v1";
const IV_LENGTH_BYTES = 12;

export interface EncryptedApiKeyPayload {
  version: 1;
  alg: "AES-GCM";
  iv: string;
  ciphertext: string;
}

export interface FirestoreProviderConfig
  extends Omit<ProviderConfig, "apiKey"> {
  apiKey?: string;
  encryptedApiKey?: EncryptedApiKeyPayload;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function deriveUserKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const material = encoder.encode(`${KEY_DERIVATION_CONTEXT}:${userId}`);
  const digest = await crypto.subtle.digest("SHA-256", material);

  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: ENCRYPTION_ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptApiKey(
  apiKey: string,
  userId: string,
): Promise<EncryptedApiKeyPayload> {
  const key = await deriveUserKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const plaintext = new TextEncoder().encode(apiKey);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    plaintext,
  );

  return {
    version: ENCRYPTION_VERSION,
    alg: ENCRYPTION_ALGORITHM,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptApiKey(
  payload: EncryptedApiKeyPayload,
  userId: string,
): Promise<string> {
  if (
    payload.version !== ENCRYPTION_VERSION ||
    payload.alg !== ENCRYPTION_ALGORITHM
  ) {
    throw new Error("Unsupported API key encryption payload.");
  }

  const key = await deriveUserKey(userId);
  const plaintext = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}

export function isEncryptedApiKeyPayload(
  value: unknown,
): value is EncryptedApiKeyPayload {
  return (
    !!value &&
    typeof value === "object" &&
    (value as EncryptedApiKeyPayload).version === ENCRYPTION_VERSION &&
    (value as EncryptedApiKeyPayload).alg === ENCRYPTION_ALGORITHM &&
    typeof (value as EncryptedApiKeyPayload).iv === "string" &&
    typeof (value as EncryptedApiKeyPayload).ciphertext === "string"
  );
}

export async function toFirestoreProviderConfig(
  config: ProviderConfig,
  userId: string,
): Promise<FirestoreProviderConfig> {
  const { apiKey, ...rest } = config;

  return {
    ...rest,
    encryptedApiKey: await encryptApiKey(apiKey, userId),
  };
}

export async function fromFirestoreProviderConfig(
  value: unknown,
  userId: string,
): Promise<{
  config: ProviderConfig | null;
  migratedConfig: FirestoreProviderConfig | null;
}> {
  if (!value || typeof value !== "object") {
    return { config: null, migratedConfig: null };
  }

  const record = value as FirestoreProviderConfig;
  const model = typeof record.model === "string" ? record.model : "";

  if (isEncryptedApiKeyPayload(record.encryptedApiKey)) {
    return {
      config: {
        apiKey: await decryptApiKey(record.encryptedApiKey, userId),
        model,
        baseUrl: record.baseUrl,
        maxTokens: record.maxTokens,
        temperature: record.temperature,
      },
      migratedConfig: null,
    };
  }

  if (typeof record.apiKey === "string") {
    return {
      config: {
        apiKey: record.apiKey,
        model,
        baseUrl: record.baseUrl,
        maxTokens: record.maxTokens,
        temperature: record.temperature,
      },
      migratedConfig: await toFirestoreProviderConfig(
        {
          apiKey: record.apiKey,
          model,
          baseUrl: record.baseUrl,
          maxTokens: record.maxTokens,
          temperature: record.temperature,
        },
        userId,
      ),
    };
  }

  return { config: null, migratedConfig: null };
}
