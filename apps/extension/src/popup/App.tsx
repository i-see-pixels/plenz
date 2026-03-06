import { useState, useEffect } from "preact/hooks";
import logo from "../assets/logo.svg";
import { providers } from "@promptlens/providers";
import { AuthStatus } from "../components/AuthStatus";

export function App() {
  const [modelStatus, setModelStatus] = useState<{
    configured: boolean;
    modelId: string | null;
  } | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchActiveModel();

    // Listen for changes from other contexts (e.g. options page)
    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.preferences) {
        fetchActiveModel();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const fetchActiveModel = () => {
    chrome.runtime.sendMessage({ type: "GET_ACTIVE_MODEL" }, (response) => {
      if (response && !response.error) {
        setModelStatus({
          configured: response.isConfigured,
          modelId: response.activeModelId,
        });
      } else if (response?.error) {
        console.error("Popup: received error", response.error);
      }
    });
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleModelChange = (e: Event) => {
    const newModelId = (e.target as HTMLSelectElement).value;
    if (!newModelId) return;

    chrome.runtime.sendMessage(
      {
        type: "SET_ACTIVE_MODEL",
        payload: { modelId: newModelId },
      },
      (response) => {
        if (response?.success) {
          // Optimistic update
          setModelStatus((prev) =>
            prev ? { ...prev, modelId: newModelId } : null,
          );
        }
      },
    );
  };

  return (
    <div className="w-80 p-4 bg-white shadow-xl flex flex-col gap-4">
      <header className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <img src={logo} alt="PromptLens" className="w-6 h-6" />
          <h1 className="font-bold text-lg text-gray-800">PromptLens</h1>
        </div>
        <button
          onClick={openSettings}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          title="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </header>

      <div className="border-b pb-4 px-1">
        <AuthStatus />
      </div>

      <main className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Active Model
          </h2>
          {modelStatus ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <select
                  value={modelStatus.modelId || ""}
                  onChange={handleModelChange}
                  className="text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer w-full p-0"
                  disabled={!modelStatus.configured}
                >
                  <option value="" disabled>
                    Select a model...
                  </option>
                  {providers.map((provider) => (
                    <optgroup key={provider.id} label={provider.name}>
                      {provider.models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ml-2 ${modelStatus.configured ? "bg-green-500" : "bg-red-500"}`}
                  title={
                    modelStatus.configured ? "Configured" : "Missing API Key"
                  }
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="animate-pulse w-full h-4 bg-gray-200 rounded" />
            </div>
          )}
        </div>

        {!modelStatus?.configured && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-2">
            <p className="text-xs text-blue-700 font-medium">
              ✨ Setup your model to enable real-time prompt enhancement.
            </p>
            <button
              onClick={openSettings}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md transition-colors shadow-sm"
            >
              Configure Now
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button className="flex items-center gap-3 w-full p-2 hover:bg-gray-50 rounded-lg transition-colors text-sm text-gray-700">
            <span className="text-lg">📊</span>
            <span>Dashboard</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 hover:bg-gray-50 rounded-lg transition-colors text-sm text-gray-700">
            <span className="text-lg">🤝</span>
            <span>Community</span>
          </button>
        </div>
      </main>

      <footer className="text-[10px] text-center text-gray-400 pt-2 border-t font-medium uppercase tracking-widest">
        PromptLens · v1.0.0
      </footer>
    </div>
  );
}
