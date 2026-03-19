import type { ProviderConfig, StorageResult } from "@promptlens/types";
import { providers } from "@promptlens/providers";
import { AuthManager } from "./auth";
import {
  createStorageBackend,
  getDefaultSyncStatus,
  MODEL_CONFIG_KEY_PREFIX,
} from "./storage-backend";

export interface UserPreferences {
  debounceTime: number;
  activeModelId: string | null;
  theme: "light" | "dark" | "system";
}

const DEFAULT_PREFERENCES: UserPreferences = {
  debounceTime: 500,
  activeModelId: null,
  theme: "system",
};

export const StorageManager = {
  async isUserSignedIn(): Promise<boolean> {
    const user = await AuthManager.getAuthStatus();
    return !!user;
  },

  async getPreferences(): Promise<UserPreferences> {
    const syncData = await chrome.storage.sync.get("preferences");

    if (syncData.preferences) {
      return {
        ...DEFAULT_PREFERENCES,
        ...syncData.preferences,
      };
    }

    // Fallback & Migrate from local storage
    const localData = await chrome.storage.local.get("preferences");
    const migratedPrefs = {
      ...DEFAULT_PREFERENCES,
      ...(localData.preferences || {}),
    };

    if (localData.preferences) {
      await chrome.storage.sync.set({ preferences: migratedPrefs });
      // Clean up local
      await chrome.storage.local.remove("preferences");
    }

    return migratedPrefs;
  },

  async setPreferences(prefs: Partial<UserPreferences>): Promise<void> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    await chrome.storage.sync.set({
      preferences: updated,
    });
  },

  async getModelConfig(
    providerId: string,
  ): Promise<StorageResult<ProviderConfig>> {
    const backend = createStorageBackend(await this.isUserSignedIn());
    return backend.getModelConfig(providerId);
  },

  async setModelConfig(
    providerId: string,
    config: ProviderConfig,
  ): Promise<StorageResult<void>> {
    const backend = createStorageBackend(await this.isUserSignedIn());
    return backend.setModelConfig(providerId, config);
  },

  async getAllModelConfigs(): Promise<
    StorageResult<Record<string, ProviderConfig>>
  > {
    const backend = createStorageBackend(await this.isUserSignedIn());
    return backend.getAllModelConfigs();
  },

  async migrateLocalToSync(): Promise<{ migrated: number; errors: string[] }> {
    if (!(await this.isUserSignedIn())) {
      return { migrated: 0, errors: [] };
    }

    const localData = await chrome.storage.local.get(null);
    const configKeys = Object.keys(localData).filter((key) =>
      key.startsWith(MODEL_CONFIG_KEY_PREFIX),
    );

    const errors: string[] = [];
    let migrated = 0;

    for (const key of configKeys) {
      try {
        const syncData = await chrome.storage.sync.get(key);
        if (!syncData[key]) {
          await chrome.storage.sync.set({ [key]: localData[key] });
        }

        await chrome.storage.local.remove(key);
        migrated++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown migration error";
        errors.push(`Failed to migrate ${key}: ${message}`);
      }
    }

    return { migrated, errors };
  },

  async cacheSyncToLocal(): Promise<{ cached: number; errors: string[] }> {
    const result = await this.getAllModelConfigs();
    const configs = result.data ?? {};
    const errors: string[] = [];
    let cached = 0;

    for (const [key, value] of Object.entries(configs)) {
      try {
        await chrome.storage.local.set({ [key]: value });
        cached++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown cache error";
        errors.push(`Failed to cache ${key}: ${message}`);
      }
    }

    return { cached, errors };
  },

  async getActiveModelConfig(): Promise<StorageResult<ProviderConfig>> {
    const { activeModelId } = await this.getPreferences();
    const isSignedIn = await this.isUserSignedIn();
    const defaultSyncStatus = getDefaultSyncStatus(isSignedIn);
    if (!activeModelId) {
      return { data: null, syncStatus: defaultSyncStatus };
    }

    // Find which provider owns this model
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

    // CRITICAL: Override the stored model in config with the activeModelId
    // This ensures that switching models in the popup (which updates activeModelId)
    // actually changes the model used for analysis.
    return {
      ...configResult,
      data: { ...config, model: activeModelId },
    };
  },
};
