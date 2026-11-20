import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore/lite";
import { AuthManager } from "./auth";
import { fromFirestoreProviderConfig, isLegacyRecord } from "./encryption";
import { getFirestoreDb, isFirebaseConfigured } from "./firebase";
import { getFirebaseUserId } from "./firebase-user";
import {
  changePassphrase,
  createVault,
  exportDataKey,
  fromBase64,
  importDataKey,
  isVaultRecord,
  toBase64,
  unlockVault,
  WrongPassphraseError,
} from "./vault-crypto";

export type VaultStatus =
  | "unavailable"
  | "signed-out"
  | "not-set-up"
  | "locked"
  | "unlocked";

/**
 * Once unlocked, a device keeps the data key in local extension storage,
 * the same place API keys live when sync is off, so the passphrase is needed
 * once per device rather than on every browser start. The server never sees
 * the passphrase or the data key.
 */
const DEVICE_KEY = "syncVaultDeviceKey";
type DeviceKey = { userId: string; key: string };

let cached: { userId: string; key: CryptoKey } | null = null;

function vaultRef(userId: string) {
  return doc(getFirestoreDb(), "users", userId, "sync", "vault");
}

function configsRef(userId: string) {
  return collection(getFirestoreDb(), "users", userId, "model_configs");
}

async function readVault(userId: string) {
  const snapshot = await getDoc(vaultRef(userId));
  const data = snapshot.exists() ? snapshot.data() : null;
  return isVaultRecord(data) ? data : null;
}

async function remember(userId: string, key: CryptoKey) {
  const stored: DeviceKey = { userId, key: toBase64(await exportDataKey(key)) };
  await chrome.storage.local.set({ [DEVICE_KEY]: stored });
  cached = { userId, key };
}

/** Rewrites pre-passphrase documents with the data key. Returns how many. */
async function upgradeLegacyRecords(userId: string, dataKey: CryptoKey) {
  const snapshot = await getDocs(configsRef(userId));
  let upgraded = 0;
  for (const record of snapshot.docs) {
    if (!isLegacyRecord(record.data())) continue;
    const { migratedConfig } = await fromFirestoreProviderConfig(
      record.data(),
      userId,
      record.id,
      dataKey,
    );
    if (migratedConfig) {
      await setDoc(record.ref, migratedConfig);
      upgraded++;
    }
  }
  return upgraded;
}

type Result = { success: boolean; error?: string; upgraded?: number };

export const SyncVault = {
  /** This device's data key for `userId`, or null when locked or not set up. */
  async dataKey(userId: string): Promise<CryptoKey | null> {
    if (cached?.userId === userId) return cached.key;
    const stored = (await chrome.storage.local.get(DEVICE_KEY))[DEVICE_KEY] as
      | DeviceKey
      | undefined;
    if (!stored || stored.userId !== userId) return null;
    const key = await importDataKey(fromBase64(stored.key));
    cached = { userId, key };
    return key;
  },

  async status(): Promise<VaultStatus> {
    if (!isFirebaseConfigured()) return "unavailable";
    if (!(await AuthManager.getAuthStatus())) return "signed-out";
    const userId = await getFirebaseUserId();
    if (!(await readVault(userId))) return "not-set-up";
    return (await SyncVault.dataKey(userId)) ? "unlocked" : "locked";
  },

  async setUp(passphrase: string): Promise<Result> {
    const userId = await getFirebaseUserId();
    if (await readVault(userId)) {
      return {
        success: false,
        error: "A sync passphrase is already set. Unlock it instead.",
      };
    }
    const { vault, dataKey } = await createVault(passphrase);
    await setDoc(vaultRef(userId), vault);
    await remember(userId, dataKey);
    return {
      success: true,
      upgraded: await upgradeLegacyRecords(userId, dataKey),
    };
  },

  async unlock(passphrase: string): Promise<Result> {
    const userId = await getFirebaseUserId();
    const vault = await readVault(userId);
    if (!vault)
      return { success: false, error: "No sync passphrase is set up yet." };
    try {
      const dataKey = await unlockVault(vault, passphrase);
      await remember(userId, dataKey);
      // Another device on an older version may have written legacy records.
      return {
        success: true,
        upgraded: await upgradeLegacyRecords(userId, dataKey),
      };
    } catch (error) {
      if (error instanceof WrongPassphraseError)
        return { success: false, error: error.message };
      throw error;
    }
  },

  async changePassphrase(current: string, next: string): Promise<Result> {
    const userId = await getFirebaseUserId();
    const vault = await readVault(userId);
    if (!vault)
      return { success: false, error: "No sync passphrase is set up yet." };
    try {
      await setDoc(
        vaultRef(userId),
        await changePassphrase(vault, current, next),
      );
      return { success: true };
    } catch (error) {
      if (error instanceof WrongPassphraseError)
        return { success: false, error: error.message };
      throw error;
    }
  },

  /** Forget the key on this device; the passphrase unlocks it again. */
  async lock(): Promise<Result> {
    cached = null;
    await chrome.storage.local.remove(DEVICE_KEY);
    return { success: true };
  },

  /**
   * For a forgotten passphrase: the synced keys can't be decrypted by anyone,
   * so delete them with the vault. Re-enter keys afterwards.
   */
  async reset(): Promise<Result> {
    const userId = await getFirebaseUserId();
    const snapshot = await getDocs(configsRef(userId));
    await Promise.all(snapshot.docs.map((record) => deleteDoc(record.ref)));
    await deleteDoc(vaultRef(userId));
    await SyncVault.lock();
    return { success: true };
  },
};
