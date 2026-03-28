import { useEffect, useState } from "preact/hooks";
import { providers } from "@promptlens/providers";
import type {
  ConnectionTestResult,
  ProviderConfig,
  StorageResult,
  SyncStatus,
  ModelOption,
} from "@promptlens/types";
import { Badge } from "@promptlens/ui/components/badge";
import { Button } from "@promptlens/ui/components/button";
import { Input } from "@promptlens/ui/components/input";
import { Label } from "@promptlens/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@promptlens/ui/components/select";
import { cn } from "@promptlens/ui/lib/utils";
import { AlertTriangle, Cloud, HardDrive, LoaderCircle } from "lucide-react";

type StorageBackendPreference = "chrome-sync" | "firebase";

type SaveState = {
  status: SyncStatus;
  error?: string;
};

type StorageSettingsResponse = {
  storageBackend: StorageBackendPreference;
  firebaseConfigured: boolean;
};

type ActionResponse = {
  success: boolean;
  error?: string;
};

type MigrationResponse = {
  migrated: number;
  errors: string[];
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

function isMigrationResponse(value: unknown): value is MigrationResponse {
  return (
    !!value &&
    typeof value === "object" &&
    "migrated" in value &&
    Array.isArray((value as MigrationResponse).errors)
  );
}

function isActionResponse(value: unknown): value is ActionResponse {
  return !!value && typeof value === "object" && "success" in value;
}

function isUserInfoResponse(value: unknown) {
  return !!value && typeof value === "object" && "email" in value;
}

function getResponseError(value: unknown) {
  if (value && typeof value === "object" && "error" in value) {
    return typeof value.error === "string" ? value.error : "Unknown error";
  }

  return undefined;
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
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    result?: ConnectionTestResult;
  }>({ loading: false });
  const [saveState, setSaveState] = useState<SaveState>({
    status: "local-only",
  });
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [storageBackend, setStorageBackend] =
    useState<StorageBackendPreference>("chrome-sync");
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [backendState, setBackendState] = useState<{
    loading: boolean;
    tone: "muted" | "error";
    message?: string;
  }>({
    loading: false,
    tone: "muted",
  });

  const provider =
    providers.find((item) => item.id === selectedProvider) ?? providers[0];
  const usesCustomModelInput =
    selectedProvider === "custom" || selectedProvider === "openrouter";

  const loadAuthStatus = async () => {
    const response = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" });
    setIsSignedIn(isUserInfoResponse(response));
  };

  const loadStorageSettings = async () => {
    const rawResponse = await chrome.runtime.sendMessage({
      type: "GET_STORAGE_SETTINGS",
    });
    const response = isStorageSettingsResponse(rawResponse) ? rawResponse : null;

    if (!response) {
      setBackendState({
        loading: false,
        tone: "error",
        message: getResponseError(rawResponse) || "Failed to load sync settings.",
      });
      return;
    }

    setStorageBackend(response.storageBackend);
    setFirebaseConfigured(response.firebaseConfigured);
  };

  const loadConfig = async () => {
    const rawResponse = await chrome.runtime.sendMessage({
      type: "GET_MODEL_CONFIG",
      payload: { providerId: selectedProvider },
    });
    const response = isStorageResult<ProviderConfig>(rawResponse)
      ? rawResponse
      : null;

    const config = response?.data;
    if (config) {
      setApiKey(config.apiKey || "");
      setSelectedModel(config.model || "");
      setBaseUrl(config.baseUrl || "");
    } else {
      setApiKey("");
      setSelectedModel("");
      setBaseUrl("");
    }

    setSaveState({
      status: response?.syncStatus || (isSignedIn ? "synced" : "local-only"),
      error: response?.error,
    });
  };

  useEffect(() => {
    void loadAuthStatus();
    void loadStorageSettings();
  }, []);

  useEffect(() => {
    const handleAuthChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ user: unknown | null }>;
      setIsSignedIn(!!customEvent.detail?.user);
      void loadStorageSettings();
    };

    window.addEventListener("promptlens-auth-status-changed", handleAuthChange);
    return () => {
      window.removeEventListener(
        "promptlens-auth-status-changed",
        handleAuthChange,
      );
    };
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [selectedProvider, isSignedIn, storageBackend]);

  useEffect(() => {
    const fetchModelsWithCache = async () => {
      const p = providers.find((prov) => prov.id === selectedProvider) || providers[0];
      const cacheKey = `models_${selectedProvider}`;
      
      if (!apiKey && selectedProvider !== "openrouter" && selectedProvider !== "custom") {
        chrome.storage.local.get([cacheKey], (res) => {
          setModels((res[cacheKey] as ModelOption[]) || []);
        });
        return;
      }

      setFetchingModels(true);
      try {
        const fetched = await p.fetchModels({ apiKey, baseUrl, model: "" });
        if (fetched && fetched.length > 0) {
          setModels(fetched);
          chrome.storage.local.set({ [cacheKey]: fetched });
        } else {
          chrome.storage.local.get([cacheKey], (res) => {
            setModels((res[cacheKey] as ModelOption[]) || []);
          });
        }
      } catch {
        chrome.storage.local.get([cacheKey], (res) => {
          setModels((res[cacheKey] as ModelOption[]) || []);
        });
      } finally {
        setFetchingModels(false);
      }
    };

    const timer = setTimeout(fetchModelsWithCache, 600);
    return () => clearTimeout(timer);
  }, [selectedProvider, apiKey, baseUrl]);

  const handleTest = async () => {
    setTestStatus({ loading: true });
    try {
      const response = await chrome.runtime.sendMessage({
        type: "TEST_CONNECTION",
        payload: {
          providerId: selectedProvider,
          config: { apiKey, model: selectedModel, baseUrl } as ProviderConfig,
        },
      });
      setTestStatus({ loading: false, result: response });
    } catch (error) {
      setTestStatus({
        loading: false,
        result: {
          success: false,
          latencyMs: 0,
          error: (error as Error).message,
        },
      });
    }
  };

  const handleStorageBackendChange = async (
    nextBackend: StorageBackendPreference,
  ) => {
    if (nextBackend === storageBackend || backendState.loading) {
      return;
    }

    if (nextBackend === "firebase" && !isSignedIn) {
      setBackendState({
        loading: false,
        tone: "error",
        message: "Sign in with Google before enabling Cloud Sync.",
      });
      return;
    }

    if (nextBackend === "firebase" && !firebaseConfigured) {
      setBackendState({
        loading: false,
        tone: "error",
        message:
          "Firebase is not configured in this build. Add the VITE_FIREBASE_* environment variables before enabling Cloud Sync.",
      });
      return;
    }

    setBackendState({
      loading: true,
      tone: "muted",
      message:
        nextBackend === "firebase"
          ? "Migrating saved provider settings to Cloud Sync..."
          : "Switching to Chrome Sync...",
    });

    try {
      let migration: MigrationResponse | null = null;

      if (nextBackend === "firebase") {
        const migrationResponse = await chrome.runtime.sendMessage({
          type: "MIGRATE_SYNC_TO_FIREBASE",
        });
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

      const actionResponse = await chrome.runtime.sendMessage({
        type: "SET_STORAGE_BACKEND",
        payload: { backend: nextBackend },
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
      setBackendState({
        loading: false,
        tone: migration?.errors.length ? "error" : "muted",
        message:
          nextBackend === "firebase"
            ? migration?.errors.length
              ? `Cloud Sync enabled with warnings. ${migration.errors[0]}`
              : migration && migration.migrated > 0
                ? `Cloud Sync enabled. Migrated ${migration.migrated} provider configuration${migration.migrated === 1 ? "" : "s"} from Chrome Sync.`
                : "Cloud Sync enabled."
            : "Chrome Sync enabled. Existing Cloud Sync data remains available if you switch back.",
      });
    } catch (error) {
      setBackendState({
        loading: false,
        tone: "error",
        message: (error as Error).message,
      });
    }
  };

  const handleSave = async () => {
    setSaveState({ status: "syncing" });

    try {
      const rawResponse = await chrome.runtime.sendMessage({
        type: "SAVE_MODEL_CONFIG",
        payload: {
          providerId: selectedProvider,
          config: {
            apiKey,
            model: selectedModel,
            baseUrl,
          } as ProviderConfig,
        },
      });
      const response = isStorageResult<void>(rawResponse) ? rawResponse : null;
      const responseError = getResponseError(rawResponse);
      const nextError = response?.error || responseError;
      const isHardError =
        response?.syncStatus === "error" || (!response && !!nextError);

      if (isHardError) {
        const errorMessage = nextError || "Unknown error";
        setSaveState({ status: "error", error: errorMessage });
        alert(`Error saving settings: ${errorMessage}`);
        return;
      }

      setSaveState({
        status: response?.syncStatus || (isSignedIn ? "synced" : "local-only"),
        error: nextError,
      });

      await chrome.runtime.sendMessage({
        type: "SET_ACTIVE_MODEL",
        payload: { modelId: selectedModel, providerId: selectedProvider },
      });
    } catch (error) {
      setSaveState({
        status: "error",
        error: (error as Error).message,
      });
      alert(`Error saving settings: ${(error as Error).message}`);
    }
  };

  const syncMeta = getSyncStatusMeta(saveState.status, storageBackend);
  const defaultBackendMessage =
    !firebaseConfigured
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
          Sign in with Google to unlock Cloud Sync and decrypt synced API keys on this device.
        </div>
      ) : null}

      <div className="grid gap-3 rounded-sm border border-border bg-card px-3 py-3">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            Sync method
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Choose where PromptLens stores your provider configuration.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {storageBackendOptions.map(({ value, label, description, Icon }) => {
            const isSelected = storageBackend === value;
            const isDisabled =
              backendState.loading ||
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
                  isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
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
            backendState.tone === "error"
              ? "text-accent-signal"
              : "text-muted-foreground",
          )}
        >
          {backendState.message || defaultBackendMessage}
        </p>
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
                fetchingModels ? "Fetching models..." :
                selectedProvider === "openrouter"
                  ? "e.g., anthropic/claude-3-opus"
                  : "e.g., llama3"
              }
              list={`${selectedProvider}-models`}
            />
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
                <SelectItem value="..." disabled>Loading models...</SelectItem>
              ) : models.length === 0 ? (
                <SelectItem value="none" disabled>Enter API Key to load models</SelectItem>
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
          <Input
            id="base-url"
            type="text"
            value={baseUrl}
            onInput={(e) => setBaseUrl((e.target as HTMLInputElement).value)}
            placeholder="http://localhost:11434/v1"
          />
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

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          onClick={handleTest}
          disabled={testStatus.loading}
          variant="outline"
        >
          {testStatus.loading ? "Testing..." : "Test connection"}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saveState.status === "syncing" || backendState.loading}
        >
          Save configuration
        </Button>
        <Badge
          variant="outline"
          className={cn(
            "rounded-sm font-mono text-[10px] tracking-[0.12em] uppercase",
            syncMeta.className,
          )}
          title={saveState.error || syncMeta.description}
        >
          {getSyncStatusIcon(saveState.status)}
          {syncMeta.label}
        </Badge>
      </div>

      <p
        className={cn(
          "px-0 text-xs leading-relaxed",
          saveState.status === "error"
            ? "text-accent-signal"
            : "text-muted-foreground",
        )}
      >
        {saveState.error || syncMeta.description}
      </p>

      {testStatus.result ? (
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-sm border px-3 py-2",
            testStatus.result.success
              ? "border-accent-secondary bg-muted"
              : "border-accent-signal bg-muted",
          )}
        >
          <p className="text-sm leading-relaxed text-foreground">
            {testStatus.result.success
              ? `Connection OK. Latency: ${testStatus.result.latencyMs}ms`
              : `Connection failed: ${testStatus.result.error}`}
          </p>
          <Badge
            variant="outline"
            className={cn(
              "rounded-sm font-mono text-[10px] tracking-[0.12em] uppercase",
              testStatus.result.success
                ? "border-accent-secondary text-accent-secondary"
                : "border-accent-signal text-accent-signal",
            )}
          >
            {testStatus.result.success ? "Healthy" : "Error"}
          </Badge>
        </div>
      ) : null}
    </div>
  );
}
