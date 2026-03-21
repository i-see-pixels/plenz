import type {
  ProviderConfig,
  StorageResult,
  SyncStatus,
} from "@promptlens/types";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore/lite";
import { AuthManager } from "./auth";
import {
  getFirebaseAuth,
  getFirestoreDb,
  isFirebaseConfigured,
  signInToFirebase,
} from "./firebase";

export const MODEL_CONFIG_KEY_PREFIX = "model_config_";
export type StorageBackendPreference = "chrome-sync" | "firebase";

export interface StorageBackend {
  getModelConfig(providerId: string): Promise<StorageResult<ProviderConfig>>;
  setModelConfig(
    providerId: string,
    config: ProviderConfig,
  ): Promise<StorageResult<void>>;
  deleteModelConfig(providerId: string): Promise<StorageResult<void>>;
  getAllModelConfigs(): Promise<StorageResult<Record<string, ProviderConfig>>>;
}

export function getModelConfigKey(providerId: string) {
  return `${MODEL_CONFIG_KEY_PREFIX}${providerId}`;
}

function getProviderIdFromModelConfigKey(key: string) {
  if (!key.startsWith(MODEL_CONFIG_KEY_PREFIX)) {
    return null;
  }

  return key.slice(MODEL_CONFIG_KEY_PREFIX.length);
}

function filterModelConfigs(data: Record<string, unknown>) {
  return Object.entries(data).reduce<Record<string, ProviderConfig>>(
    (configs, [key, value]) => {
      const providerId = getProviderIdFromModelConfigKey(key);

      if (providerId && value) {
        configs[providerId] = value as ProviderConfig;
      }

      return configs;
    },
    {},
  );
}

export function toModelConfigStorageRecord(
  configs: Record<string, ProviderConfig>,
) {
  return Object.entries(configs).reduce<Record<string, ProviderConfig>>(
    (record, [providerId, config]) => {
      record[getModelConfigKey(providerId)] = config;
      return record;
    },
    {},
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown storage error";
}

function isQuotaError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("quota") || message.includes("max write");
}

function appendFallbackMessage<T>(
  fallbackResult: StorageResult<T>,
  error: unknown,
): StorageResult<T> {
  const fallbackMessage = `Firebase sync unavailable. Using Chrome storage fallback instead: ${getErrorMessage(error)}`;

  if (fallbackResult.syncStatus === "error") {
    return {
      ...fallbackResult,
      error: fallbackResult.error
        ? `${fallbackMessage}. ${fallbackResult.error}`
        : fallbackMessage,
    };
  }

  return {
    ...fallbackResult,
    error: fallbackMessage,
  };
}

export class ChromeLocalBackend implements StorageBackend {
  async getModelConfig(providerId: string): Promise<StorageResult<ProviderConfig>> {
    const key = getModelConfigKey(providerId);
    const data = await chrome.storage.local.get(key);
    return {
      data: (data[key] as ProviderConfig) || null,
      syncStatus: "local-only",
    };
  }

  async setModelConfig(
    providerId: string,
    config: ProviderConfig,
  ): Promise<StorageResult<void>> {
    const key = getModelConfigKey(providerId);
    await chrome.storage.local.set({ [key]: config });
    return { data: null, syncStatus: "local-only" };
  }

  async deleteModelConfig(providerId: string): Promise<StorageResult<void>> {
    await chrome.storage.local.remove(getModelConfigKey(providerId));
    return { data: null, syncStatus: "local-only" };
  }

  async getAllModelConfigs(): Promise<
    StorageResult<Record<string, ProviderConfig>>
  > {
    const data = await chrome.storage.local.get(null);
    return {
      data: filterModelConfigs(data),
      syncStatus: "local-only",
    };
  }
}

export class ChromeSyncBackend implements StorageBackend {
  private readonly localBackend = new ChromeLocalBackend();

  async getModelConfig(providerId: string): Promise<StorageResult<ProviderConfig>> {
    const key = getModelConfigKey(providerId);

    try {
      const data = await chrome.storage.sync.get(key);
      if (data[key]) {
        return {
          data: data[key] as ProviderConfig,
          syncStatus: "synced",
        };
      }
    } catch (error) {
      return {
        ...(await this.localBackend.getModelConfig(providerId)),
        error: getErrorMessage(error),
      };
    }

    const localResult = await this.localBackend.getModelConfig(providerId);
    if (localResult.data) {
      return localResult;
    }

    return {
      data: null,
      syncStatus: "synced",
    };
  }

  async setModelConfig(
    providerId: string,
    config: ProviderConfig,
  ): Promise<StorageResult<void>> {
    const key = getModelConfigKey(providerId);

    try {
      await chrome.storage.sync.set({ [key]: config });
      await chrome.storage.local.remove(key);
      return { data: null, syncStatus: "synced" };
    } catch (error) {
      if (isQuotaError(error)) {
        return this.localBackend.setModelConfig(providerId, config);
      }

      return {
        data: null,
        syncStatus: "error",
        error: getErrorMessage(error),
      };
    }
  }

  async deleteModelConfig(providerId: string): Promise<StorageResult<void>> {
    const key = getModelConfigKey(providerId);

    try {
      await chrome.storage.sync.remove(key);
      await chrome.storage.local.remove(key);
      return { data: null, syncStatus: "synced" };
    } catch (error) {
      return {
        data: null,
        syncStatus: "error",
        error: getErrorMessage(error),
      };
    }
  }

  async getAllModelConfigs(): Promise<
    StorageResult<Record<string, ProviderConfig>>
  > {
    try {
      const [syncData, localResult] = await Promise.all([
        chrome.storage.sync.get(null),
        this.localBackend.getAllModelConfigs(),
      ]);
      const localData = localResult.data ?? {};

      const merged = {
        ...localData,
        ...filterModelConfigs(syncData),
      };
      const hasLocalFallback = Object.keys(localData).length > 0;

      return {
        data: merged,
        syncStatus: hasLocalFallback ? "local-only" : "synced",
      };
    } catch (error) {
      return {
        ...(await this.localBackend.getAllModelConfigs()),
        error: getErrorMessage(error),
      };
    }
  }
}

export class FirebaseBackend implements StorageBackend {
  private readonly syncFallback = new ChromeSyncBackend();

  private async getFirebaseUserId() {
    if (!isFirebaseConfigured()) {
      throw new Error(
        "Firebase is not configured in this build. Add the VITE_FIREBASE_* environment variables before enabling Cloud Sync.",
      );
    }

    const firebaseAuth = getFirebaseAuth();
    const cachedUser = await AuthManager.getCachedUser();
    if (
      firebaseAuth.currentUser &&
      cachedUser?.email &&
      firebaseAuth.currentUser.email === cachedUser.email
    ) {
      return firebaseAuth.currentUser.uid;
    }

    const token = await AuthManager.getAuthToken(false);
    const credential = await signInToFirebase(token);
    return credential.user.uid;
  }

  private async withFirebaseFallback<T>(
    operation: (userId: string) => Promise<StorageResult<T>>,
    fallback: () => Promise<StorageResult<T>>,
  ): Promise<StorageResult<T>> {
    try {
      const userId = await this.getFirebaseUserId();
      return await operation(userId);
    } catch (error) {
      return appendFallbackMessage(await fallback(), error);
    }
  }

  async getModelConfig(providerId: string): Promise<StorageResult<ProviderConfig>> {
    return this.withFirebaseFallback(async (userId) => {
      const snapshot = await getDoc(
        doc(getFirestoreDb(), "users", userId, "model_configs", providerId),
      );

      if (!snapshot.exists()) {
        const fallbackResult = await this.syncFallback.getModelConfig(providerId);
        if (fallbackResult.data) {
          return fallbackResult;
        }

        return {
          data: null,
          syncStatus: "synced",
        };
      }

      return {
        data: snapshot.data() as ProviderConfig,
        syncStatus: "synced",
      };
    }, () => this.syncFallback.getModelConfig(providerId));
  }

  async setModelConfig(
    providerId: string,
    config: ProviderConfig,
  ): Promise<StorageResult<void>> {
    return this.withFirebaseFallback(async (userId) => {
      await setDoc(
        doc(getFirestoreDb(), "users", userId, "model_configs", providerId),
        config,
      );
      return { data: null, syncStatus: "synced" };
    }, () => this.syncFallback.setModelConfig(providerId, config));
  }

  async deleteModelConfig(providerId: string): Promise<StorageResult<void>> {
    return this.withFirebaseFallback(async (userId) => {
      await deleteDoc(
        doc(getFirestoreDb(), "users", userId, "model_configs", providerId),
      );
      return { data: null, syncStatus: "synced" };
    }, () => this.syncFallback.deleteModelConfig(providerId));
  }

  async getAllModelConfigs(): Promise<
    StorageResult<Record<string, ProviderConfig>>
  > {
    return this.withFirebaseFallback(async (userId) => {
      const [snapshot, fallbackResult] = await Promise.all([
        getDocs(collection(getFirestoreDb(), "users", userId, "model_configs")),
        this.syncFallback.getAllModelConfigs(),
      ]);
      const configs = {
        ...(fallbackResult.data ?? {}),
      };

      snapshot.forEach((modelConfig) => {
        configs[modelConfig.id] = modelConfig.data() as ProviderConfig;
      });

      return {
        data: configs,
        syncStatus: "synced",
        error: fallbackResult.error,
      };
    }, () => this.syncFallback.getAllModelConfigs());
  }
}

export function createStorageBackend(
  isSignedIn: boolean,
  backendPreference: StorageBackendPreference,
): StorageBackend {
  if (!isSignedIn) {
    return new ChromeLocalBackend();
  }

  if (backendPreference === "firebase") {
    return new FirebaseBackend();
  }

  return new ChromeSyncBackend();
}

export function getDefaultSyncStatus(isSignedIn: boolean): SyncStatus {
  return isSignedIn ? "synced" : "local-only";
}
