import { useEffect, useState } from "preact/hooks";
import { providers } from "@promptlens/providers";
import type { ConnectionTestResult, ProviderConfig } from "@promptlens/types";
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

export function ModelConfig() {
  const [selectedProvider, setSelectedProvider] = useState(providers[0].id);
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState(providers[0].models[0].id);
  const [baseUrl, setBaseUrl] = useState("");
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    result?: ConnectionTestResult;
  }>({ loading: false });

  const provider =
    providers.find((p) => p.id === selectedProvider) ?? providers[0];
  const usesCustomModelInput =
    selectedProvider === "custom" || selectedProvider === "openrouter";

  useEffect(() => {
    const loadConfig = async () => {
      const key = `model_config_${selectedProvider}`;
      const data = (await chrome.storage.local.get(key)) as {
        [key: string]: ProviderConfig;
      };
      const config = data[key];
      if (config) {
        setApiKey(config.apiKey || "");
        setSelectedModel(config.model || provider.models[0].id);
        setBaseUrl(config.baseUrl || "");
      } else {
        setApiKey("");
        setSelectedModel(provider.models[0].id);
        setBaseUrl("");
      }
    };

    loadConfig();
  }, [selectedProvider, provider.models]);

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
    try {
      await chrome.storage.local.set({
        [`model_config_${selectedProvider}`]: {
          apiKey,
          model: selectedModel,
          baseUrl,
        },
      });

      const prefsData = await chrome.storage.local.get("preferences");
      const currentPrefs = prefsData.preferences || {};
      await chrome.storage.local.set({
        preferences: { ...currentPrefs, activeModelId: selectedModel },
      });

      await chrome.runtime.sendMessage({
        type: "SET_ACTIVE_MODEL",
        payload: { modelId: selectedModel },
      });

      alert("Settings saved and model set as active!");
    } catch (error) {
      alert(`Error saving settings: ${(error as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          onClick={handleTest}
          disabled={testStatus.loading}
          variant="outline"
        >
          {testStatus.loading ? "Testing..." : "Test connection"}
        </Button>
        <Button onClick={handleSave}>Save configuration</Button>
      </div>

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
