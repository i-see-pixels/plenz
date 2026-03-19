import type {
  ProviderConfig,
  StorageResult,
  SyncStatus,
} from "@promptlens/types";

export const MODEL_CONFIG_KEY_PREFIX = "model_config_";

export interface StorageBackend {
  getModelConfig(providerId: string): Promise<StorageResult<ProviderConfig>>;
  setModelConfig(
    providerId: string,
    config: ProviderConfig,
  ): Promise<StorageResult<void>>;
  deleteModelConfig(providerId: string): Promise<StorageResult<void>>;
  getAllModelConfigs(): Promise<StorageResult<Record<string, ProviderConfig>>>;
}

function getModelConfigKey(providerId: string) {
  return `${MODEL_CONFIG_KEY_PREFIX}${providerId}`;
}

function filterModelConfigs(data: Record<string, unknown>) {
  return Object.entries(data).reduce<Record<string, ProviderConfig>>(
    (configs, [key, value]) => {
      if (key.startsWith(MODEL_CONFIG_KEY_PREFIX) && value) {
        configs[key] = value as ProviderConfig;
      }
      return configs;
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

class ChromeLocalBackend implements StorageBackend {
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

class ChromeSyncBackend implements StorageBackend {
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

    return this.localBackend.getModelConfig(providerId);
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

export function createStorageBackend(isSignedIn: boolean): StorageBackend {
  return isSignedIn ? new ChromeSyncBackend() : new ChromeLocalBackend();
}

export function getDefaultSyncStatus(isSignedIn: boolean): SyncStatus {
  return isSignedIn ? "synced" : "local-only";
}
