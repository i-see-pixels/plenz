import { useEffect, useState } from "preact/hooks";
import { providers } from "@promptlens/providers";
import type {
  ConnectionTestResult,
  ProviderConfig,
  StorageResult,
  SyncStatus,
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

type SaveState = {
  status: SyncStatus;
  error?: string;
};

function isStorageResult<T>(value: unknown): value is StorageResult<T> {
  return (
    !!value &&
    typeof value === "object" &&
    "syncStatus" in value
  );
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

const syncStatusMeta: Record<
  SyncStatus,
  {
    label: string;
    description: string;
    className: string;
  }
> = {
  synced: {
    label: "Synced",
    description: "Saved to Chrome sync storage and available across devices.",
    className: "border-accent-secondary text-accent-secondary",
  },
  "local-only": {
    label: "Local only",
    description: "Saved on this device only. Sign in to sync across devices.",
    className: "border-border text-muted-foreground",
  },
  syncing: {
    label: "Syncing",
    description: "Saving configuration...",
    className: "border-border text-foreground",
  },
  error: {
    label: "Error",
    description: "The last save failed.",
    className: "border-accent-signal text-accent-signal",
  },
};

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
  const [selectedModel, setSelectedModel] = useState(providers[0].models[0].id);
  const [baseUrl, setBaseUrl] = useState("");
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    result?: ConnectionTestResult;
  }>({ loading: false });
  const [saveState, setSaveState] = useState<SaveState>({
    status: "local-only",
  });
  const [isSignedIn, setIsSignedIn] = useState(false);

  const provider =
    providers.find((p) => p.id === selectedProvider) ?? providers[0];
  const usesCustomModelInput =
    selectedProvider === "custom" || selectedProvider === "openrouter";

  const loadAuthStatus = async () => {
    const response = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" });
    setIsSignedIn(isUserInfoResponse(response));
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
      setSelectedModel(config.model || provider.models[0].id);
      setBaseUrl(config.baseUrl || "");
    } else {
      setApiKey("");
      setSelectedModel(provider.models[0].id);
      setBaseUrl("");
    }

    setSaveState({
      status: response?.syncStatus || (isSignedIn ? "synced" : "local-only"),
      error: response?.error,
    });
  };

  useEffect(() => {
    void loadAuthStatus();
  }, []);

  useEffect(() => {
    const handleAuthChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ user: unknown | null }>;
      setIsSignedIn(!!customEvent.detail?.user);
      void loadConfig();
    };

    window.addEventListener("promptlens-auth-status-changed", handleAuthChange);
    return () => {
      window.removeEventListener(
        "promptlens-auth-status-changed",
        handleAuthChange,
      );
    };
  }, [selectedProvider, provider.models, isSignedIn]);

  useEffect(() => {
    void loadConfig();
  }, [selectedProvider, provider.models, isSignedIn]);

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

      if (response?.error || responseError) {
        const errorMessage = response?.error || responseError || "Unknown error";
        setSaveState({ status: "error", error: errorMessage });
        alert(`Error saving settings: ${errorMessage}`);
        return;
      }

      setSaveState({
        status: response?.syncStatus || (isSignedIn ? "synced" : "local-only"),
      });

      await chrome.runtime.sendMessage({
        type: "SET_ACTIVE_MODEL",
        payload: { modelId: selectedModel },
      });
    } catch (error) {
      setSaveState({
        status: "error",
        error: (error as Error).message,
      });
      alert(`Error saving settings: ${(error as Error).message}`);
    }
  };

  const syncMeta = syncStatusMeta[saveState.status];

  return (
    <div className="flex flex-col gap-3">
      {!isSignedIn ? (
        <div className="rounded-sm border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          Sign in with Google to sync your API keys across devices.
        </div>
      ) : null}

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
            const nextProvider = providers.find((prov) => prov.id === value);
            if (nextProvider) {
              setSelectedModel(nextProvider.models[0].id);
            }
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
                selectedProvider === "openrouter"
                  ? "e.g., anthropic/claude-3-opus"
                  : "e.g., llama3"
              }
              list={`${selectedProvider}-models`}
            />
            <datalist id={`${selectedProvider}-models`}>
              {provider.models.map((model) => (
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
              {provider.models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
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
        <Button onClick={handleSave} disabled={saveState.status === "syncing"}>
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
