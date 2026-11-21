// End-to-end encryption for API keys synced to Cloud Sync (Firestore).
//
// A random AES-256 data key encrypts each API key. The data key is itself
// encrypted ("wrapped") with a key derived from the user's passphrase, so the
// server only ever holds the salt, the wrapped data key and ciphertexts.
// Changing the passphrase re-wraps one key; it never re-encrypts every config.
// Pure WebCrypto with no extension APIs, so it can be tested in Node.

export const PBKDF2_ITERATIONS = 600_000; // OWASP guidance for PBKDF2-HMAC-SHA256
export const MIN_PASSPHRASE_LENGTH = 10;

const VAULT_AAD = "plenz:vault:v2";

export type EncryptedSecret = {
  version: 2;
  alg: "AES-GCM";
  iv: string;
  ciphertext: string;
};

/** Stored in Firestore. Holds nothing that reveals the passphrase or data key. */
export type VaultRecord = {
  version: 2;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; salt: string };
  wrappedKey: { iv: string; ciphertext: string };
};

export class WrongPassphraseError extends Error {
  constructor() {
    super("That passphrase doesn't match.");
    this.name = "WrongPassphraseError";
  }
}

const encoder = new TextEncoder();

export function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function deriveWrappingKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function wrap(
  dataKey: CryptoKey,
  passphrase: string,
  iterations: number,
): Promise<VaultRecord> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const wrappingKey = await deriveWrappingKey(passphrase, salt, iterations);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", dataKey));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(VAULT_AAD) },
    wrappingKey,
    raw,
  );
  return {
    version: 2,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations, salt: toBase64(salt) },
    wrappedKey: {
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(ciphertext)),
    },
  };
}

/** Kept extractable so an unlocked device can store it locally (see sync-vault.ts). */
export function importDataKey(raw: Uint8Array<ArrayBuffer>) {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportDataKey(key: CryptoKey) {
  return new Uint8Array(await crypto.subtle.exportKey("raw", key));
}

export function isVaultRecord(value: unknown): value is VaultRecord {
  const v = value as VaultRecord;
  return (
    !!v &&
    v.version === 2 &&
    v.kdf?.name === "PBKDF2" &&
    typeof v.kdf.salt === "string" &&
    typeof v.kdf.iterations === "number" &&
    typeof v.wrappedKey?.iv === "string" &&
    typeof v.wrappedKey?.ciphertext === "string"
  );
}

export async function createVault(
  passphrase: string,
  iterations = PBKDF2_ITERATIONS,
) {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`Use at least ${MIN_PASSPHRASE_LENGTH} characters.`);
  }
  const dataKey = await importDataKey(randomBytes(32));
  return { vault: await wrap(dataKey, passphrase, iterations), dataKey };
}

/** The data key, or WrongPassphraseError (AES-GCM authentication fails). */
export async function unlockVault(
  vault: VaultRecord,
  passphrase: string,
): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(
    passphrase,
    fromBase64(vault.kdf.salt),
    vault.kdf.iterations,
  );
  try {
    const raw = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: fromBase64(vault.wrappedKey.iv),
        additionalData: encoder.encode(VAULT_AAD),
      },
      wrappingKey,
      fromBase64(vault.wrappedKey.ciphertext),
    );
    return importDataKey(new Uint8Array(raw));
  } catch {
    throw new WrongPassphraseError();
  }
}

/** Same data key under a new passphrase (and a fresh salt). */
export async function changePassphrase(
  vault: VaultRecord,
  current: string,
  next: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<VaultRecord> {
  if (next.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`Use at least ${MIN_PASSPHRASE_LENGTH} characters.`);
  }
  return wrap(await unlockVault(vault, current), next, iterations);
}

/** `context` binds the ciphertext to where it's stored (account + provider). */
export async function encryptSecret(
  dataKey: CryptoKey,
  plaintext: string,
  context: string,
): Promise<EncryptedSecret> {
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(context) },
    dataKey,
    encoder.encode(plaintext),
  );
  return {
    version: 2,
    alg: "AES-GCM",
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptSecret(
  dataKey: CryptoKey,
  secret: EncryptedSecret,
  context: string,
): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(secret.iv),
      additionalData: encoder.encode(context),
    },
    dataKey,
    fromBase64(secret.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export function isEncryptedSecret(value: unknown): value is EncryptedSecret {
  const v = value as EncryptedSecret;
  return (
    !!v &&
    v.version === 2 &&
    v.alg === "AES-GCM" &&
    typeof v.iv === "string" &&
    typeof v.ciphertext === "string"
  );
}

/** Ties an API key's ciphertext to its account and provider document. */
export function secretContext(userId: string, providerId: string) {
  return `plenz:key:v2:${userId}:${providerId}`;
}
