import { useState, useEffect } from "preact/hooks";
import { providers } from "@promptlens/providers";
import type { ConnectionTestResult, ProviderConfig } from "@promptlens/types";
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

  const provider = providers.find((p) => p.id === selectedProvider) ?? providers[0];
  const usesCustomModelInput = selectedProvider === "custom" || selectedProvider === "openrouter";

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="provider">Provider</Label>
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="model">Model</Label>
        {usesCustomModelInput ? (
          <>
            <Input
              id="model"
              type="text"
              value={selectedModel}
              onInput={(e) => setSelectedModel((e.target as HTMLInputElement).value)}
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
          </>
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="base-url">Base URL</Label>
          <Input
            id="base-url"
            type="text"
            value={baseUrl}
            onInput={(e) => setBaseUrl((e.target as HTMLInputElement).value)}
            placeholder="http://localhost:11434/v1"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="api-key">API Key</Label>
        <Input
          id="api-key"
          type="password"
          value={apiKey}
          onInput={(e) => setApiKey((e.target as HTMLInputElement).value)}
          placeholder="sk-..."
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={handleTest} disabled={testStatus.loading} variant="outline">
          {testStatus.loading ? "Testing..." : "Test connection"}
        </Button>
        <Button onClick={handleSave}>Save configuration</Button>
      </div>

      {testStatus.result ? (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            testStatus.result.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {testStatus.result.success
            ? `Success! Latency: ${testStatus.result.latencyMs}ms`
            : `Error: ${testStatus.result.error}`}
        </div>
      ) : null}
    </div>
  );
}
