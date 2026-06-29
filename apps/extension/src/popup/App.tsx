import { useEffect, useState } from "preact/hooks";
import logo from "../assets/logo.svg";
import { providers } from "@plenz/providers";
import { AuthStatus } from "../components/AuthStatus";
import type { ModelOption } from "@plenz/types";
import { BarChart3, BookOpen, Settings, Users } from "lucide-react";
import { Badge } from "@plenz/ui/components/badge";
import { Button } from "@plenz/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@plenz/ui/components/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@plenz/ui/components/select";
import { Separator } from "@plenz/ui/components/separator";
import { Skeleton } from "@plenz/ui/components/skeleton";
import { Switch } from "@plenz/ui/components/switch";

const PROJECT_URL = "https://github.com/i-see-pixels/plenz";
const COMMUNITY_URL = "https://github.com/i-see-pixels/plenz/discussions";
const PREFERENCES_STORAGE_KEY = "preferences";

type Preferences = {
  debounceMs?: number;
  debounceTime?: number;
  suggestionsEnabled?: boolean;
  chatContextEnabled?: boolean;
};

export function App() {
  const extensionVersion = chrome.runtime.getManifest().version;
  const [modelStatus, setModelStatus] = useState<{
    configured: boolean;
    modelId: string | null;
  } | null>(null);
  const [providerModels, setProviderModels] = useState<Record<string, ModelOption[]>>({});
  const [openingPromptGallery, setOpeningPromptGallery] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    suggestionsEnabled: true,
    chatContextEnabled: false,
  });
  const [savingSuggestions, setSavingSuggestions] = useState(false);
  const [savingChatContext, setSavingChatContext] = useState(false);

  useEffect(() => {
    fetchActiveModel();
    fetchProviderModels();
    void fetchPreferences();

    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.preferences) {
        fetchActiveModel();
        void fetchPreferences();
      }
      // Reload models if cached models change
      const changedKeys = Object.keys(changes);
      if (changedKeys.some(k => k.startsWith("models_"))) {
        fetchProviderModels();
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

  const fetchProviderModels = () => {
    const keys = providers.map((p) => `models_${p.id}`);
    chrome.storage.local.get(keys, (res) => {
      const pm: Record<string, ModelOption[]> = {};
      providers.forEach((p) => {
        pm[p.id] = (res[`models_${p.id}`] as ModelOption[]) || [];
      });
      setProviderModels(pm);
    });
  };

  const fetchPreferences = async () => {
    try {
      const runtimePreferences = (await chrome.runtime.sendMessage({
        type: "GET_PREFERENCES",
      })) as Preferences | undefined;
      const stored = await chrome.storage.local.get(PREFERENCES_STORAGE_KEY);
      const localPreferences = stored[PREFERENCES_STORAGE_KEY] as
        | Preferences
        | undefined;
      setPreferences(runtimePreferences ?? localPreferences ?? {});
    } catch (error) {
      console.error("Popup: failed to load preferences", error);
    }
  };

  const updateSuggestionsEnabled = async (enabled: boolean) => {
    const previousPreferences = preferences;
    setSavingSuggestions(true);
    setPreferences((current) => ({
      ...current,
      suggestionsEnabled: enabled,
    }));

    try {
      const stored = await chrome.storage.local.get(PREFERENCES_STORAGE_KEY);
      const currentPreferences =
        (stored[PREFERENCES_STORAGE_KEY] as Preferences | undefined) ?? {};
      const nextPreferences = {
        ...currentPreferences,
        ...previousPreferences,
        suggestionsEnabled: enabled,
      };

      await chrome.runtime.sendMessage({
        type: "SET_PREFERENCES",
        payload: {
          preferences: {
            suggestionsEnabled: enabled,
          },
        },
      });

      await chrome.storage.local.set({
        [PREFERENCES_STORAGE_KEY]: nextPreferences,
      });
    } catch (error) {
      console.error("Popup: failed to update suggestions preference", error);
      setPreferences(previousPreferences);
    } finally {
      setSavingSuggestions(false);
    }
  };

  const updateChatContextEnabled = async (enabled: boolean) => {
    const previousPreferences = preferences;
    setSavingChatContext(true);
    setPreferences((current) => ({
      ...current,
      chatContextEnabled: enabled,
    }));

    try {
      const stored = await chrome.storage.local.get(PREFERENCES_STORAGE_KEY);
      const currentPreferences =
        (stored[PREFERENCES_STORAGE_KEY] as Preferences | undefined) ?? {};
      const nextPreferences = {
        ...currentPreferences,
        ...previousPreferences,
        chatContextEnabled: enabled,
      };

      await chrome.runtime.sendMessage({
        type: "SET_PREFERENCES",
        payload: {
          preferences: {
            chatContextEnabled: enabled,
          },
        },
      });

      await chrome.storage.local.set({
        [PREFERENCES_STORAGE_KEY]: nextPreferences,
      });
    } catch (error) {
      console.error("Popup: failed to update chat context preference", error);
      setPreferences(previousPreferences);
    } finally {
      setSavingChatContext(false);
    }
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const openExternalPage = (url: string) => {
    void chrome.tabs.create({ url });
  };

  const openPromptGallery = async () => {
    if (openingPromptGallery) {
      return;
    }

    setOpeningPromptGallery(true);

    try {
      const currentWindow = await chrome.windows.getCurrent();

      if (typeof currentWindow.id !== "number") {
        throw new Error("Current browser window is unavailable.");
      }

      const response = (await chrome.runtime.sendMessage({
        type: "OPEN_PROMPT_GALLERY_PANEL",
        payload: { windowId: currentWindow.id },
      })) as { success?: boolean; error?: string } | undefined;

      if (!response?.success) {
        throw new Error(response?.error || "Prompt gallery could not be opened.");
      }

      window.close();
    } catch (error) {
      console.error("Popup: failed to open prompt gallery", error);
      setOpeningPromptGallery(false);
    }
  };

  const handleModelChange = (newModelId: string) => {
    if (!newModelId) return;

    chrome.runtime.sendMessage(
      {
        type: "SET_ACTIVE_MODEL",
        payload: { 
          modelId: newModelId,
          // Find the provider that has this model to pass both
          providerId: Object.entries(providerModels).find(([_, models]) => models.some((m) => m.id === newModelId))?.[0] || ""
        },
      },
      (response) => {
        if (response?.success) {
          setModelStatus((prev) =>
            prev ? { ...prev, modelId: newModelId } : null,
          );
        }
      },
    );
  };

  const suggestionsEnabled = preferences.suggestionsEnabled !== false;
  const chatContextEnabled = preferences.chatContextEnabled === true;

  return (
    <div className="plenz-popup-scrollbar max-h-[600px] w-80 overflow-y-auto border border-border bg-background">
      <Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="plenz" className="size-5" />
            <div className="flex flex-col gap-0.5 leading-none">
              <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                plenz
              </p>
              <h1 className="text-sm font-semibold tracking-tight">
                Control panel
              </h1>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={openSettings}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings />
          </Button>
        </CardHeader>

        <CardContent className="px-0 py-0">
          <section className="flex flex-col gap-3 px-4 py-3">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Account
            </p>
            <AuthStatus />
          </section>

          <section className="flex flex-col gap-3 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Active model
              </p>
              {modelStatus?.configured ? (
                <Badge
                  variant="outline"
                  className="rounded-sm border-accent-signal font-mono text-[10px] tracking-[0.12em] text-accent-signal uppercase"
                >
                  Configured
                </Badge>
              ) : null}
            </div>

            {modelStatus ? (
              <Select
                value={modelStatus.modelId ?? undefined}
                onValueChange={handleModelChange}
                disabled={!modelStatus.configured}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => {
                    const models = providerModels[provider.id] || [];
                    if (models.length === 0) return null;
                    return (
                      <SelectGroup key={provider.id}>
                        <SelectLabel>{provider.name}</SelectLabel>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Skeleton className="h-9 w-full rounded-sm" />
            )}
          </section>

          {!modelStatus?.configured ? (
            <>
              <Separator />
              <section className="flex flex-col gap-3 px-4 py-3">
                <p className="rounded-sm border border-accent-signal bg-muted px-3 py-2 text-xs leading-relaxed">
                  Model configuration is required before inline prompt
                  enhancement is enabled.
                </p>
                <Button onClick={openSettings}>Configure model</Button>
              </section>
            </>
          ) : null}

          <Separator />
          <section className="flex flex-col gap-3 px-4 py-3">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Suggestions
            </p>
            <div className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-3">
              <label
                htmlFor="suggestions-enabled"
                className="text-sm font-medium leading-none"
              >
                Enable suggestions
              </label>
              <Switch
                id="suggestions-enabled"
                checked={suggestionsEnabled}
                disabled={savingSuggestions}
                onCheckedChange={(checked) =>
                  void updateSuggestionsEnabled(checked)
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-3">
              <label
                htmlFor="chat-context-enabled"
                className="text-sm font-medium leading-none"
              >
                Use chat conversation
              </label>
              <Switch
                id="chat-context-enabled"
                checked={chatContextEnabled}
                disabled={savingChatContext}
                onCheckedChange={(checked) =>
                  void updateChatContextEnabled(checked)
                }
              />
            </div>
          </section>

          <Separator />
          <section className="flex flex-col gap-3 px-4 py-3">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Prompt gallery
            </p>
            <Button
              className="justify-start gap-2"
              onClick={openPromptGallery}
              disabled={openingPromptGallery}
            >
              <BookOpen data-icon="inline-start" />
              {openingPromptGallery ? "Opening gallery..." : "Open prompt gallery"}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Browse trending prompts, review newly added ideas, and keep your
              saved prompts in one side panel.
            </p>
          </section>

          <Separator />
          <section className="flex flex-col gap-2 px-4 py-3">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Links
            </p>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => openExternalPage(PROJECT_URL)}
              >
                <BarChart3 data-icon="inline-start" />
                Project
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => openExternalPage(COMMUNITY_URL)}
              >
                <Users data-icon="inline-start" />
                Community
              </Button>
            </div>
          </section>
        </CardContent>

        <CardFooter className="justify-between px-4 py-2">
          <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            plenz
          </p>
          <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            v{extensionVersion}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

