import { useEffect, useState } from "preact/hooks";
import {
  ON_DEVICE_MODEL_ID,
  ON_DEVICE_PROVIDER_ID,
  providers,
} from "@plenz/providers";
import type {
  ConnectionTestResult,
  ProviderConfig,
  StorageResult,
  SyncStatus,
  ModelOption,
} from "@plenz/types";
import { Badge } from "@plenz/ui/components/badge";
import { Button } from "@plenz/ui/components/button";
import { Input } from "@plenz/ui/components/input";
import { Label } from "@plenz/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@plenz/ui/components/select";
import { cn } from "@plenz/ui/lib/utils";
import { AlertTriangle, Cloud, HardDrive, LoaderCircle } from "lucide-react";
import { useAuthSession } from "./useAuthSession";
import { OnDeviceModel } from "./OnDeviceModel";
import { isRpcFailure, sendRpc } from "../shared/rpc";
import { SyncPassphrase } from "./SyncPassphrase";
import type { VaultStatus } from "../background/sync-vault";
import {
  backendNotice,
  backendTransition,
  saveBadgeStatus,
  saveMessage,
  saveTransition,
  testInputsKey,
  testTransition,
  visibleTestResult,
  type BackendEvent,
  type BackendState,
  type MigrationResult,
  type SaveEvent,
  type SaveState,
  type StorageBackendPreference,
  type TestEvent,
  type TestState,
} from "./model-config-machine";

type StorageSettingsResponse = {
  storageBackend: StorageBackendPreference;
  firebaseConfigured: boolean;
};

type ActionResponse = {
  success: boolean;
  error?: string;
};

const storageBackendOptions: Array<{
  value: StorageBackendPreference;
  label: string;
  description: string;
  Icon: typeof HardDrive;
}> = [
  {
    value: "chrome-sync",
    label: "Chrome Sync",
    description: "Syncs across Chrome browsers where Chrome Sync is enabled.",
    Icon: HardDrive,
  },
  {
    value: "firebase",
    label: "Cloud Sync",
    description: "Syncs across browsers with Firebase and Google sign-in.",
    Icon: Cloud,
  },
];

function isStorageResult<T>(value: unknown): value is StorageResult<T> {
  return !!value && typeof value === "object" && "syncStatus" in value;
}

function isStorageSettingsResponse(
  value: unknown,
): value is StorageSettingsResponse {
  return (
    !!value &&
    typeof value === "object" &&
    "storageBackend" in value &&
    "firebaseConfigured" in value
  );
}

function isMigrationResponse(value: unknown): value is MigrationResult {
  return (
    !!value &&
    typeof value === "object" &&
    "migrated" in value &&
    Array.isArray((value as MigrationResult).errors)
  );
}

function isActionResponse(value: unknown): value is ActionResponse {
  return !!value && typeof value === "object" && "success" in value;
}

function getResponseError(value: unknown) {
  if (value && typeof value === "object" && "error" in value) {
    return typeof value.error === "string" ? value.error : "Unknown error";
  }

  return undefined;
}

function getCustomProviderOriginPattern(baseUrl: string) {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return `${url.origin}/*`;
  } catch {
    return null;
  }
}

function getSyncStatusMeta(
  status: SyncStatus,
  storageBackend: StorageBackendPreference,
) {
  switch (status) {
    case "synced":
      return {
        label: "Synced",
        description:
          storageBackend === "firebase"
            ? "Saved to Cloud Sync and available anywhere you sign in with Google."
            : "Saved to Chrome Sync and available across Chrome browsers.",
        className: "border-accent-secondary text-accent-secondary",
      };
    case "local-only":
      return {
        label: "Local only",
        description:
          "Saved on this device only. Enable a signed-in sync backend to share it across devices.",
        className: "border-border text-muted-foreground",
      };
    case "syncing":
      return {
        label: "Syncing",
        description: "Saving configuration...",
        className: "border-border text-foreground",
      };
    case "error":
      return {
        label: "Error",
        description: "The last save failed.",
        className: "border-accent-signal text-accent-signal",
      };
  }
}

function getSyncStatusIcon(status: SyncStatus) {
  switch (status) {
    case "synced":
      return <Cloud className="size-3" />;
    case "local-only":
      return <HardDrive className="size-3" />;
    case "syncing":
      return <LoaderCircle className="size-3 animate-spin" />;
    case "error":
      return <AlertTriangle className="size-3" />;
  }
}

export function ModelConfig() {
  const [selectedProvider, setSelectedProvider] = useState(providers[0].id);
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [testState, setTestState] = useState<TestState>({ kind: "idle" });
  const [saveState, setSaveState] = useState<SaveState>({
    kind: "idle",
    syncStatus: "local-only",
  });
  const { auth } = useAuthSession();
  const isSignedIn = auth.status === "signedIn";
  const [storageBackend, setStorageBackend] =
    useState<StorageBackendPreference>("chrome-sync");
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [backendState, setBackendState] = useState<BackendState>({
    kind: "idle",
  });

  const updateSave = (event: SaveEvent) =>
    setSaveState((current) => saveTransition(current, event));
  const updateBackend = (event: BackendEvent) =>
    setBackendState((current) => backendTransition(current, event));
  const updateTest = (event: TestEvent) =>
    setTestState((current) => testTransition(current, event));

  const provider =
    providers.find((item) => item.id === selectedProvider) ?? providers[0];
  // Chrome's built-in model has no key or model to choose.
  const isOnDevice = selectedProvider === ON_DEVICE_PROVIDER_ID;
  const effectiveModel = isOnDevice ? ON_DEVICE_MODEL_ID : selectedModel;
  const usesCustomModelInput =
    selectedProvider === "custom" || selectedProvider === "openrouter";
  const testInputs = testInputsKey({
    providerId: selectedProvider,
    apiKey,
    model: effectiveModel,
    baseUrl,
  });

  const loadStorageSettings = async () => {
    const rawResponse = await sendRpc("GET_STORAGE_SETTINGS");
    const response = isStorageSettingsResponse(rawResponse)
      ? rawResponse
      : null;

    if (!response) {
      updateBackend({
        type: "SETTINGS_LOAD_FAILED",
        message:
          getResponseError(rawResponse) || "Failed to load sync settings.",
      });
      return;
    }

    setStorageBackend(response.storageBackend);
    setFirebaseConfigured(response.firebaseConfigured);
  };

  // Storage settings depend on who is signed in, so reload them on every change.
  useEffect(() => {
    void loadStorageSettings();
  }, [isSignedIn]);

  // The passphrase that encrypts synced keys; only relevant when Cloud Sync is possible.
  const loadVaultStatus = async () => {
    if (!isSignedIn || !firebaseConfigured) {
      setVaultStatus(null);
      return;
    }
    const reply = await sendRpc("GET_SYNC_VAULT_STATUS");
    if (!isRpcFailure(reply)) setVaultStatus(reply.status);
  };

  useEffect(() => {
    void loadVaultStatus();
  }, [isSignedIn, firebaseConfigured]);

  // Load the saved config for the selected provider. Switching again before
  // the reply arrives makes it stale, so it is dropped. Unlocking Cloud Sync
  // makes a synced key readable, so that reloads it too.
  useEffect(() => {
    let stale = false;

    void (async () => {
      const rawResponse = await sendRpc("GET_MODEL_CONFIG", {
        providerId: selectedProvider,
      });
      if (stale) return;

      const response = isStorageResult<ProviderConfig>(rawResponse)
        ? rawResponse
        : null;
      const config = response?.data;
      setApiKey(config?.apiKey || "");
      setSelectedModel(config?.model || "");
      setBaseUrl(config?.baseUrl || "");
      updateSave({
        type: "CONFIG_LOADED",
        syncStatus:
          response?.syncStatus || (isSignedIn ? "synced" : "local-only"),
        warning: response?.error,
      });
    })();

    return () => {
      stale = true;
    };
  }, [selectedProvider, isSignedIn, storageBackend, vaultStatus]);

  useEffect(() => {
    // Set when the provider, key or URL changes again; late replies are dropped.
    let stale = false;
    const p =
      providers.find((prov) => prov.id === selectedProvider) || providers[0];
    const cacheKey = `models_${selectedProvider}`;
    const showCachedModels = () => {
      chrome.storage.local.get([cacheKey], (res) => {
        if (!stale) setModels((res[cacheKey] as ModelOption[]) || []);
      });
    };

    const fetchModelsWithCache = async () => {
      if (
        !apiKey &&
        selectedProvider !== "openrouter" &&
        selectedProvider !== "custom"
      ) {
        showCachedModels();
        return;
      }

      setFetchingModels(true);
      try {
        const fetched = await p.fetchModels({ apiKey, baseUrl, model: "" });
        if (stale) return;
        if (fetched && fetched.length > 0) {
          setModels(fetched);
          chrome.storage.local.set({ [cacheKey]: fetched });
        } else {
          showCachedModels();
        }
      } catch {
        showCachedModels();
      } finally {
        if (!stale) setFetchingModels(false);
      }
    };

    const timer = setTimeout(fetchModelsWithCache, 600);
    return () => {
      stale = true;
      clearTimeout(timer);
      setFetchingModels(false);
    };
  }, [selectedProvider, apiKey, baseUrl]);

  const handleTest = async () => {
    const inputs = testInputs;
    const finish = (result: ConnectionTestResult) =>
      updateTest({ type: "TEST_FINISHED", inputs, result });
    const fail = (error: string) =>
      finish({ success: false, latencyMs: 0, error });

    updateTest({ type: "TEST_STARTED", inputs });
    try {
      if (selectedProvider === "custom") {
        const originPattern = getCustomProviderOriginPattern(baseUrl);

        if (!originPattern) {
          fail("Enter a valid http(s) Custom Provider URL.");
          return;
        }

        const granted = await chrome.permissions.request({
          origins: [originPattern],
        });

        if (!granted) {
          fail(
            "Permission denied for that provider host. Approve access and try again.",
          );
          return;
        }
      }

      const response = await sendRpc("TEST_CONNECTION", {
        providerId: selectedProvider,
        config: { apiKey, model: effectiveModel, baseUrl } as ProviderConfig,
      });
      if ("success" in response) {
        finish(response);
      } else {
        fail(response.error);
      }
    } catch (error) {
      fail((error as Error).message);
    }
  };

  const handleStorageBackendChange = async (
    nextBackend: StorageBackendPreference,
  ) => {
    const next = backendTransition(backendState, {
      type: "SWITCH_REQUESTED",
      target: nextBackend,
      current: storageBackend,
      isSignedIn,
      firebaseConfigured,
      vaultReady: vaultStatus === "unlocked",
    });
    setBackendState(next);
    if (next.kind !== "switching") {
      return;
    }

    try {
      let migration: MigrationResult | null = null;

      if (nextBackend === "firebase") {
        const migrationResponse = await sendRpc("MIGRATE_SYNC_TO_FIREBASE");
        migration = isMigrationResponse(migrationResponse)
          ? migrationResponse
          : null;

        if (!migration) {
          throw new Error(
            getResponseError(migrationResponse) ||
              "Failed to migrate existing settings to Cloud Sync.",
          );
        }
      }

      const actionResponse = await sendRpc("SET_STORAGE_BACKEND", {
        backend: nextBackend,
      });
      const result = isActionResponse(actionResponse) ? actionResponse : null;

      if (!result?.success) {
        throw new Error(
          result?.error ||
            getResponseError(actionResponse) ||
            "Failed to update the sync method.",
        );
      }

      setStorageBackend(nextBackend);
      updateBackend({ type: "SWITCH_SUCCEEDED", migration });
    } catch (error) {
      updateBackend({ type: "SWITCH_FAILED", message: (error as Error).message });
    }
  };

  const handleSave = async () => {
    if (saveState.kind === "saving") {
      return;
    }

    const fail = (errorMessage: string) => {
      updateSave({ type: "SAVE_FAILED", error: errorMessage });
      alert(`Error saving settings: ${errorMessage}`);
    };

    updateSave({ type: "SAVE_STARTED" });
    try {
      if (selectedProvider === "custom") {
        const originPattern = getCustomProviderOriginPattern(baseUrl);

        if (!originPattern) {
          fail("Enter a valid http(s) Custom Provider URL.");
          return;
        }

        const granted = await chrome.permissions.request({
          origins: [originPattern],
        });

        if (!granted) {
          fail(
            "Permission denied for that provider host. Approve access before saving.",
          );
          return;
        }
      }

      const rawResponse = await sendRpc("SAVE_MODEL_CONFIG", {
        providerId: selectedProvider,
        config: {
          apiKey,
          model: effectiveModel,
          baseUrl,
        } as ProviderConfig,
      });
      const response = isStorageResult<void>(rawResponse) ? rawResponse : null;
      const responseError = getResponseError(rawResponse);
      const nextError = response?.error || responseError;
      const isHardError =
        response?.syncStatus === "error" || (!response && !!nextError);

      if (isHardError) {
        fail(nextError || "Unknown error");
        return;
      }

      updateSave({
        type: "SAVE_SUCCEEDED",
        syncStatus:
          response?.syncStatus || (isSignedIn ? "synced" : "local-only"),
        warning: nextError,
      });

      await sendRpc("SET_ACTIVE_MODEL", {
        modelId: effectiveModel,
        providerId: selectedProvider,
      });
    } catch (error) {
      fail((error as Error).message);
    }
  };

  const badgeStatus = saveBadgeStatus(saveState);
  const syncMeta = getSyncStatusMeta(badgeStatus, storageBackend);
  const saveDetail = saveMessage(saveState) || syncMeta.description;
  const backendLine = backendNotice(backendState);
  const isSwitchingBackend = backendState.kind === "switching";
  const testResult = visibleTestResult(testState, testInputs);
  const defaultBackendMessage = !firebaseConfigured
    ? "Cloud Sync is unavailable in this build. Add the VITE_FIREBASE_* environment variables and rebuild the extension."
    : !isSignedIn
      ? "Sign in with Google to enable Cloud Sync and access encrypted synced API keys."
      : storageBackend === "firebase"
        ? "Cloud Sync stores provider settings in Firebase, with API keys encrypted before upload. Browser-local copies are unchanged."
        : "Chrome Sync uses Chrome's built-in sync storage and falls back to local storage when needed.";

  return (
    <div className="flex flex-col gap-3">
      {!isSignedIn ? (
        <div className="rounded-sm border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          Sign in with Google to unlock Cloud Sync and decrypt synced API keys
          on this device.
        </div>
      ) : null}

      <div className="grid gap-3 rounded-sm border border-border bg-card px-3 py-3">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            Sync method
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Choose where plenz stores your provider configuration.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {storageBackendOptions.map(({ value, label, description, Icon }) => {
            const isSelected = storageBackend === value;
            const isDisabled =
              isSwitchingBackend ||
              (value === "firebase" && (!isSignedIn || !firebaseConfigured));

            return (
              <button
                key={value}
                type="button"
                className={cn(
                  "flex flex-col items-start gap-2 rounded-sm border px-3 py-3 text-left transition-colors",
                  isSelected
                    ? "border-accent-secondary bg-muted"
                    : "border-border bg-background hover:border-accent-secondary/50",
                  isDisabled
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer",
                )}
                onClick={() => void handleStorageBackendChange(value)}
                disabled={isDisabled}
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon className="size-4" />
                  {label}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {description}
                </span>
              </button>
            );
          })}
        </div>

        <p
          className={cn(
            "text-xs leading-relaxed",
            backendLine?.tone === "error"
              ? "text-accent-signal"
              : "text-muted-foreground",
          )}
        >
          {backendLine?.message || defaultBackendMessage}
        </p>
        {isSignedIn && firebaseConfigured ? (
          <SyncPassphrase
            status={vaultStatus}
            cloudSyncActive={storageBackend === "firebase"}
            onChanged={() => void loadVaultStatus()}
          />
        ) : null}
      </div>

      <div className="grid gap-3 rounded-sm px-3 py-3 sm:grid-cols-[170px_1fr] sm:items-center">
        <Label
          htmlFor="provider"
          className="font-mono text-[11px] tracking-[0.14em] uppercase"
        >
          Provider
        </Label>
        <Select
          value={selectedProvider}
          onValueChange={(value) => {
            setSelectedProvider(value);
            setSelectedModel("");
          }}
        >
          <SelectTrigger id="provider" className="w-full">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isOnDevice ? (
        <OnDeviceModel />
      ) : (
      <>
      <div className="grid gap-3 rounded-sm px-3 py-3 sm:grid-cols-[170px_1fr] sm:items-center">
        <Label
          htmlFor="model"
          className="font-mono text-[11px] tracking-[0.14em] uppercase"
        >
          Model
        </Label>
        {usesCustomModelInput ? (
          <div className="flex flex-col gap-2">
            <Input
              id="model"
              type="text"
              value={selectedModel}
              onInput={(e) =>
                setSelectedModel((e.target as HTMLInputElement).value)
              }
              placeholder={
                fetchingModels
                  ? "Fetching models..."
                  : selectedProvider === "openrouter"
                    ? "e.g., anthropic/claude-3-opus"
                    : "e.g., deepseek-chat or llama3.1"
              }
              list={`${selectedProvider}-models`}
            />
            {selectedProvider === "custom" ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Enter the exact model ID from your provider. Examples include{" "}
                <code>deepseek-chat</code>, <code>deepseek-reasoner</code>, or{" "}
                <code>llama3.1</code>.
              </p>
            ) : null}
            <datalist id={`${selectedProvider}-models`}>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </datalist>
          </div>
        ) : (
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger id="model" className="w-full">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.length === 0 && fetchingModels ? (
                <SelectItem value="..." disabled>
                  Loading models...
                </SelectItem>
              ) : models.length === 0 ? (
                <SelectItem value="none" disabled>
                  Enter API Key to load models
                </SelectItem>
              ) : (
                models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedProvider === "custom" ? (
        <div className="grid gap-3 rounded-sm px-3 py-3 sm:grid-cols-[170px_1fr] sm:items-center">
          <Label
            htmlFor="base-url"
            className="font-mono text-[11px] tracking-[0.14em] uppercase"
          >
            Base URL
          </Label>
          <div className="flex flex-col gap-2">
            <Input
              id="base-url"
              type="text"
              value={baseUrl}
              onInput={(e) => setBaseUrl((e.target as HTMLInputElement).value)}
              placeholder="https://your-provider.example/v1"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Enter the provider base URL or the full chat completions endpoint.
              plenz appends <code>/chat/completions</code> automatically for
              base URLs. DeepSeek works with{" "}
              <code>https://api.deepseek.com</code> or{" "}
              <code>https://api.deepseek.com/v1</code>.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 rounded-sm px-3 py-3 sm:grid-cols-[170px_1fr] sm:items-center">
        <Label
          htmlFor="api-key"
          className="font-mono text-[11px] tracking-[0.14em] uppercase"
        >
          API key
        </Label>
        <Input
          id="api-key"
          type="password"
          value={apiKey}
          onInput={(e) => setApiKey((e.target as HTMLInputElement).value)}
          placeholder="sk-..."
        />
      </div>
      </>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          onClick={handleTest}
          disabled={testState.kind === "testing"}
          variant="outline"
        >
          {testState.kind === "testing" ? "Testing..." : "Test connection"}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saveState.kind === "saving" || isSwitchingBackend}
        >
          Save configuration
        </Button>
        <Badge
          variant="outline"
          className={cn(
            "rounded-sm font-mono text-[10px] tracking-[0.12em] uppercase",
            syncMeta.className,
          )}
          title={saveDetail}
        >
          {getSyncStatusIcon(badgeStatus)}
          {syncMeta.label}
        </Badge>
      </div>

      <p
        className={cn(
          "px-0 text-xs leading-relaxed",
          badgeStatus === "error"
            ? "text-accent-signal"
            : "text-muted-foreground",
        )}
      >
        {saveDetail}
      </p>

      {testResult ? (
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-sm border px-3 py-2",
            testResult.success
              ? "border-accent-secondary bg-muted"
              : "border-accent-signal bg-muted",
          )}
        >
          <p className="text-sm leading-relaxed text-foreground">
            {testResult.success
              ? `Connection OK. Latency: ${testResult.latencyMs}ms`
              : `Connection failed: ${testResult.error}`}
          </p>
          <Badge
            variant="outline"
            className={cn(
              "rounded-sm font-mono text-[10px] tracking-[0.12em] uppercase",
              testResult.success
                ? "border-accent-secondary text-accent-secondary"
                : "border-accent-signal text-accent-signal",
            )}
          >
            {testResult.success ? "Healthy" : "Error"}
          </Badge>
        </div>
      ) : null}
    </div>
  );
}
