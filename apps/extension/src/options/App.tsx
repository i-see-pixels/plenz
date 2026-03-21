import { useEffect, useState } from "preact/hooks";
import logo from "../assets/logo.svg";
import { AuthStatus } from "../components/AuthStatus";
import { ModelConfig } from "../components/ModelConfig";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@promptlens/ui/components/card";
import { Badge } from "@promptlens/ui/components/badge";
import { Button } from "@promptlens/ui/components/button";
import { Input } from "@promptlens/ui/components/input";
import { Label } from "@promptlens/ui/components/label";

const PREFERENCES_STORAGE_KEY = "preferences";
const DEFAULT_DEBOUNCE_MS = 500;

type Preferences = {
  debounceMs?: number;
};

function sanitizeDebounceMs(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DEBOUNCE_MS;
  }

  return Math.max(0, Math.min(5000, Math.round(value)));
}

export function App() {
  const [debounceInput, setDebounceInput] = useState(
    String(DEFAULT_DEBOUNCE_MS),
  );
  const [preferencesState, setPreferencesState] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    message?: string;
  }>({ status: "idle" });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await chrome.storage.local.get(PREFERENCES_STORAGE_KEY);
        const preferences = stored[PREFERENCES_STORAGE_KEY] as
          | Preferences
          | undefined;
        setDebounceInput(String(sanitizeDebounceMs(preferences?.debounceMs)));
      } catch (error) {
        setPreferencesState({
          status: "error",
          message: (error as Error).message,
        });
      }
    };

    void loadPreferences();
  }, []);

  const savePreferences = async () => {
    const nextDebounceMs = sanitizeDebounceMs(Number(debounceInput));

    setPreferencesState({ status: "saving" });

    try {
      const stored = await chrome.storage.local.get(PREFERENCES_STORAGE_KEY);
      const currentPreferences =
        (stored[PREFERENCES_STORAGE_KEY] as Preferences | undefined) ?? {};

      await chrome.storage.local.set({
        [PREFERENCES_STORAGE_KEY]: {
          ...currentPreferences,
          debounceMs: nextDebounceMs,
        },
      });

      setDebounceInput(String(nextDebounceMs));
      setPreferencesState({ status: "saved" });
    } catch (error) {
      setPreferencesState({
        status: "error",
        message: (error as Error).message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Card className="grid gap-4 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PromptLens" className="size-9" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                PromptLens Control Panel
              </h1>
            </div>
          </div>
          <div className="w-full sm:w-[260px]">
            <AuthStatus />
          </div>
        </Card>

        <Card className="gap-0 rounded-md border-border py-0 shadow-none">
          <CardHeader className="gap-0 font-mono border-b border-border px-4 pt-4">
            <CardTitle className="font-mono text-lg font-semibold tracking-[0.16em] uppercase">
              Model configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Configure the model to use for prompt analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <ModelConfig />
          </CardContent>
        </Card>

        <Card className="gap-0 rounded-md border-border py-0 shadow-none">
          <CardHeader className="gap-0 font-mono border-b border-border px-4 pt-4">
            <CardTitle className="font-mono text-lg font-semibold tracking-[0.16em] uppercase">
              General preferences
            </CardTitle>
            <CardDescription className="text-xs">
              Configure the extension's general preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <div className="grid gap-4 px-3 py-3">
              <div className="grid gap-3 sm:grid-cols-[220px_1fr] sm:items-center">
                <Label
                  htmlFor="debounce"
                  className="font-mono text-[11px] tracking-[0.14em] uppercase"
                >
                  Debounce time (ms)
                </Label>
                <Input
                  id="debounce"
                  type="number"
                  min={0}
                  max={5000}
                  step={50}
                  value={debounceInput}
                  onInput={(event) =>
                    setDebounceInput(
                      (event.target as HTMLInputElement).value || "0",
                    )
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={savePreferences}
                  disabled={preferencesState.status === "saving"}
                >
                  {preferencesState.status === "saving"
                    ? "Saving..."
                    : "Save preferences"}
                </Button>
                <Badge variant="outline">
                  {preferencesState.status === "saved"
                    ? "Saved"
                    : preferencesState.status === "error"
                      ? "Error"
                      : "Local"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {preferencesState.status === "error"
                  ? preferencesState.message || "Failed to save preferences."
                  : "Controls how long PromptLens waits after you stop typing before running analysis."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
