import { useState, useEffect } from "preact/hooks";
import { providers } from "@promptlens/providers";
import { ProviderConfig, ConnectionTestResult } from "@promptlens/types";

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
    providers.find((p) => p.id === selectedProvider) || providers[0];

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
  }, [selectedProvider]);

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
      // 1. Save provider config
      await chrome.storage.local.set({
        [`model_config_${selectedProvider}`]: {
          apiKey,
          model: selectedModel,
          baseUrl,
        },
      });

      // 2. Set as active model in preferences (Direct write)
      const prefsData = await chrome.storage.local.get("preferences");
      const currentPrefs = prefsData.preferences || {};
      await chrome.storage.local.set({
        preferences: { ...currentPrefs, activeModelId: selectedModel },
      });

      // 3. Notify background (Optional but good for triggers)
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
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-2">
          Provider
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => {
            const val = (e.target as HTMLSelectElement).value;
            setSelectedProvider(val);
            const p = providers.find((prov) => prov.id === val);
            if (p) setSelectedModel(p.models[0].id);
          }}
          className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black focus:border-black rounded-none transition-colors duration-200"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-2">
          Model
        </label>
        {selectedProvider === "custom" || selectedProvider === "openrouter" ? (
          <input
            type="text"
            value={selectedModel}
            onChange={(e) =>
              setSelectedModel((e.target as HTMLInputElement).value)
            }
            className="mt-1 px-3 py-2 block w-full border border-gray-300 rounded-none focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors duration-200"
            placeholder={
              selectedProvider === "openrouter"
                ? "e.g., anthropic/claude-3-opus"
                : "e.g., llama3"
            }
            list={`${selectedProvider}-models`}
          />
        ) : (
          <select
            value={selectedModel}
            onChange={(e) =>
              setSelectedModel((e.target as HTMLSelectElement).value)
            }
            className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black focus:border-black rounded-none transition-colors duration-200"
          >
            {provider.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
        {(selectedProvider === "custom" ||
          selectedProvider === "openrouter") && (
          <datalist id={`${selectedProvider}-models`}>
            {provider.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </datalist>
        )}
      </div>

      {selectedProvider === "custom" && (
        <div>
          <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-2">
            Base URL
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl((e.target as HTMLInputElement).value)}
            className="mt-1 px-3 py-2 block w-full border border-gray-300 rounded-none focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors duration-200"
            placeholder="http://localhost:11434/v1"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-2">
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey((e.target as HTMLInputElement).value)}
          className="mt-1 px-3 py-2 block w-full border border-gray-300 rounded-none focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors duration-200"
          placeholder="sk-..."
        />
      </div>

      <div className="flex gap-4 pt-2">
        <button
          onClick={handleTest}
          disabled={testStatus.loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-bold rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
        >
          {testStatus.loading ? "Testing..." : "Test Connection"}
        </button>
        <button
          onClick={handleSave}
          className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-bold rounded-full text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
        >
          Save Configuration
        </button>
      </div>

      {testStatus.result && (
        <div
          className={`mt-2 p-2 rounded-md ${testStatus.result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          {testStatus.result.success
            ? `Success! Latency: ${testStatus.result.latencyMs}ms`
            : `Error: ${testStatus.result.error}`}
        </div>
      )}
    </div>
  );
}
