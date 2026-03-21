import type { ProviderConfig, StorageResult } from "@promptlens/types";
import { doc, setDoc } from "firebase/firestore/lite";
import { providers } from "@promptlens/providers";
import { AuthManager } from "./auth";
import {
  ChromeLocalBackend,
  ChromeSyncBackend,
  createStorageBackend,
  getDefaultSyncStatus,
  getModelConfigKey,
  type StorageBackendPreference,
} from "./storage-backend";
import {
  getFirestoreDb,
  isFirebaseConfigured,
  signInToFirebase,
} from "./firebase";
import { toFirestoreProviderConfig } from "./encryption";

export interface UserPreferences {
  debounceTime: number;
  activeModelId: string | null;
  theme: "light" | "dark" | "system";
  storageBackend: StorageBackendPreference;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  debounceTime: 500,
  activeModelId: null,
  theme: "system",
  storageBackend: "chrome-sync",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function normalizePreferences(value: unknown): UserPreferences {
  const prefs: Partial<UserPreferences> & { debounceMs?: unknown } =
    value && typeof value === "object"
      ? (value as Partial<UserPreferences> & { debounceMs?: unknown })
      : {};
  const theme =
    prefs.theme === "light" || prefs.theme === "dark" || prefs.theme === "system"
      ? prefs.theme
      : DEFAULT_PREFERENCES.theme;
  const activeModelId =
    typeof prefs.activeModelId === "string" ? prefs.activeModelId : null;
  const debounceTime =
    typeof prefs.debounceTime === "number" && Number.isFinite(prefs.debounceTime)
      ? prefs.debounceTime
      : typeof prefs.debounceMs === "number" && Number.isFinite(prefs.debounceMs)
        ? prefs.debounceMs
        : DEFAULT_PREFERENCES.debounceTime;
  const storageBackend =
    prefs.storageBackend === "firebase" ? "firebase" : "chrome-sync";

  return {
    debounceTime,
    activeModelId,
    theme,
    storageBackend,
  };
}

async function writeConfigsToFirebase(configs: Record<string, ProviderConfig>) {
  const migratedProviderIds: string[] = [];
  const errors: string[] = [];

  if (Object.keys(configs).length === 0) {
    return {
      migrated: 0,
      errors,
      migratedProviderIds,
    };
  }

  if (!isFirebaseConfigured()) {
    return {
      migrated: 0,
      errors: [
        "Firebase is not configured in this build. Add the VITE_FIREBASE_* environment variables before enabling Cloud Sync.",
      ],
      migratedProviderIds,
    };
  }

  try {
    const token = await AuthManager.getAuthToken(false);
    const credential = await signInToFirebase(token);
    const userId = credential.user.uid;
    const db = getFirestoreDb();

    for (const [providerId, config] of Object.entries(configs)) {
      try {
        await setDoc(
          doc(db, "users", userId, "model_configs", providerId),
          await toFirestoreProviderConfig(config, userId),
        );
        migratedProviderIds.push(providerId);
      } catch (error) {
        errors.push(`Failed to migrate ${providerId}: ${getErrorMessage(error)}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to connect to Firebase: ${getErrorMessage(error)}`);
  }

  return {
    migrated: migratedProviderIds.length,
    errors,
    migratedProviderIds,
  };
}

export const StorageManager = {
  async isUserSignedIn(): Promise<boolean> {
    const user = await AuthManager.getAuthStatus();
    return !!user;
  },

  async getPreferences(): Promise<UserPreferences> {
    const syncData = await chrome.storage.sync.get("preferences");

    if (syncData.preferences) {
      return normalizePreferences(syncData.preferences);
    }

    const localData = await chrome.storage.local.get("preferences");
    const migratedPrefs = normalizePreferences(localData.preferences);

    if (localData.preferences) {
      await chrome.storage.sync.set({ preferences: migratedPrefs });
    }

    return migratedPrefs;
  },

  async setPreferences(prefs: Partial<UserPreferences>): Promise<void> {
    const current = await this.getPreferences();
    const updated = normalizePreferences({ ...current, ...prefs });
    await chrome.storage.sync.set({
      preferences: updated,
    });
  },

  async getStorageSettings(): Promise<{
    storageBackend: StorageBackendPreference;
    firebaseConfigured: boolean;
  }> {
    const { storageBackend } = await this.getPreferences();
    return {
      storageBackend,
      firebaseConfigured: isFirebaseConfigured(),
    };
  },

  async setStorageBackend(storageBackend: StorageBackendPreference): Promise<void> {
    await this.setPreferences({ storageBackend });
  },

  async getStorageContext() {
    const [isSignedIn, preferences] = await Promise.all([
      this.isUserSignedIn(),
      this.getPreferences(),
    ]);

    return {
      isSignedIn,
      preferences,
      backend: createStorageBackend(isSignedIn, preferences.storageBackend),
    };
  },

  async getModelConfig(
    providerId: string,
  ): Promise<StorageResult<ProviderConfig>> {
    const { backend } = await this.getStorageContext();
    return backend.getModelConfig(providerId);
  },

  async setModelConfig(
    providerId: string,
    config: ProviderConfig,
  ): Promise<StorageResult<void>> {
    const { backend } = await this.getStorageContext();
    return backend.setModelConfig(providerId, config);
  },

  async getAllModelConfigs(): Promise<
    StorageResult<Record<string, ProviderConfig>>
  > {
    const { backend } = await this.getStorageContext();
    return backend.getAllModelConfigs();
  },

  async migrateLocalToSync(): Promise<{ migrated: number; errors: string[] }> {
    if (!(await this.isUserSignedIn())) {
      return { migrated: 0, errors: [] };
    }

    const localBackend = new ChromeLocalBackend();
    const syncBackend = new ChromeSyncBackend();
    const localResult = await localBackend.getAllModelConfigs();
    const localConfigs = localResult.data ?? {};
    const errors = localResult.error ? [localResult.error] : [];
    let migrated = 0;

    for (const [providerId, config] of Object.entries(localConfigs)) {
      try {
        const result = await syncBackend.setModelConfig(providerId, config);
        if (result.syncStatus !== "synced") {
          errors.push(
            `Failed to migrate ${providerId}: ${result.error ?? "Chrome Sync is unavailable."}`,
          );
          continue;
        }

        await chrome.storage.local.remove(getModelConfigKey(providerId));
        migrated++;
      } catch (error) {
        errors.push(`Failed to migrate ${providerId}: ${getErrorMessage(error)}`);
      }
    }

    return { migrated, errors };
  },

  async migrateLocalToFirebase(): Promise<{ migrated: number; errors: string[] }> {
    if (!(await this.isUserSignedIn())) {
      return {
        migrated: 0,
        errors: ["Sign in with Google before enabling Cloud Sync."],
      };
    }

    const localBackend = new ChromeLocalBackend();
    const localResult = await localBackend.getAllModelConfigs();
    const localConfigs = localResult.data ?? {};
    const migrationResult = await writeConfigsToFirebase(localConfigs);
    const errors = localResult.error
      ? [localResult.error, ...migrationResult.errors]
      : migrationResult.errors;

    for (const providerId of migrationResult.migratedProviderIds) {
      await chrome.storage.local.remove(getModelConfigKey(providerId));
    }

    return {
      migrated: migrationResult.migrated,
      errors,
    };
  },

  async migrateLocalToPreferredBackend(): Promise<{
    migrated: number;
    errors: string[];
  }> {
    if (!(await this.isUserSignedIn())) {
      return { migrated: 0, errors: [] };
    }

    const { storageBackend } = await this.getPreferences();
    return storageBackend === "firebase"
      ? this.migrateLocalToFirebase()
      : this.migrateLocalToSync();
  },

  async migrateSyncToFirebase(): Promise<{ migrated: number; errors: string[] }> {
    if (!(await this.isUserSignedIn())) {
      return {
        migrated: 0,
        errors: ["Sign in with Google before enabling Cloud Sync."],
      };
    }

    const syncBackend = new ChromeSyncBackend();
    const syncResult = await syncBackend.getAllModelConfigs();
    const migrationResult = await writeConfigsToFirebase(syncResult.data ?? {});
    const errors = syncResult.error
      ? [syncResult.error, ...migrationResult.errors]
      : migrationResult.errors;

    return {
      migrated: migrationResult.migrated,
      errors,
    };
  },

  async cacheSyncToLocal(): Promise<{ cached: number; errors: string[] }> {
    const { backend } = await this.getStorageContext();
    const result = await backend.getAllModelConfigs();
    const configs = result.data ?? {};
    const errors = result.error ? [result.error] : [];
    let cached = 0;

    for (const [providerId, value] of Object.entries(configs)) {
      try {
        await chrome.storage.local.set({
          [getModelConfigKey(providerId)]: value,
        });
        cached++;
      } catch (error) {
        errors.push(`Failed to cache ${providerId}: ${getErrorMessage(error)}`);
      }
    }

    return { cached, errors };
  },

  async getActiveModelConfig(): Promise<StorageResult<ProviderConfig>> {
    const { activeModelId } = await this.getPreferences();
    const { isSignedIn } = await this.getStorageContext();
    const defaultSyncStatus = getDefaultSyncStatus(isSignedIn);
    if (!activeModelId) {
      return { data: null, syncStatus: defaultSyncStatus };
    }

    const provider = providers.find((p) =>
      p.models.some((m) => m.id === activeModelId),
    );

    if (!provider) {
      return { data: null, syncStatus: defaultSyncStatus };
    }

    const configResult = await this.getModelConfig(provider.id);
    const config = configResult.data;

    if (!config) {
      return configResult;
    }

    return {
      ...configResult,
      data: { ...config, model: activeModelId },
    };
  },
};
