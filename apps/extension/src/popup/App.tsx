import { useState, useEffect } from "preact/hooks";
import logo from "../assets/logo.svg";
import { providers } from "@promptlens/providers";
import { AuthStatus } from "../components/AuthStatus";
import { BarChart, Users } from "lucide-preact";

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
    <div className="w-80 p-0 bg-white border border-gray-200 flex flex-col font-sans">
      <header className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="PromptLens" className="w-5 h-5 grayscale" />
          <h1 className="font-bold text-base tracking-tight text-black">
            PromptLens
          </h1>
        </div>
        <button
          onClick={openSettings}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          title="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-black"
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

      <div className="border-b border-gray-200 px-4 py-3">
        <AuthStatus />
      </div>

      <main className="flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono mb-3">
            Active Model
          </h2>
          {modelStatus ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <select
                  value={modelStatus.modelId || ""}
                  onChange={handleModelChange}
                  className="text-sm font-semibold text-black bg-transparent border-none focus:ring-0 cursor-pointer w-full p-0"
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
                {modelStatus.configured && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white font-mono text-[9px] uppercase tracking-wider whitespace-nowrap">
                    Active
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="animate-pulse w-full h-4 bg-gray-200" />
            </div>
          )}
        </div>

        {!modelStatus?.configured && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3">
            <p className="text-xs text-black font-medium tracking-tight">
              Setup your model to enable real-time prompt enhancement.
            </p>
            <button
              onClick={openSettings}
              className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-full transition-colors"
            >
              Configure Now
            </button>
          </div>
        )}

        <div className="flex flex-col p-2">
          <button className="flex items-center gap-3 w-full p-2 hover:bg-gray-50 rounded-md transition-colors text-sm font-medium text-black">
            <BarChart className="w-4 h-4 text-gray-400" />
            <span>Dashboard</span>
          </button>
          <button className="flex items-center gap-3 w-full p-2 hover:bg-gray-50 rounded-md transition-colors text-sm font-medium text-black">
            <Users className="w-4 h-4 text-gray-400" />
            <span>Community</span>
          </button>
        </div>
      </main>

      <footer className="text-[10px] text-center text-gray-400 py-3 border-t border-gray-200 font-mono font-bold uppercase tracking-widest bg-gray-50">
        PromptLens · v1.0.0
      </footer>
    </div>
  );
}
