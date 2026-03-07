import { useEffect, useState } from "preact/hooks";
import logo from "../assets/logo.svg";
import { providers } from "@promptlens/providers";
import { AuthStatus } from "../components/AuthStatus";
import { BarChart3, Settings, Users } from "lucide-react";
import { Badge } from "@promptlens/ui/components/badge";
import { Button } from "@promptlens/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@promptlens/ui/components/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@promptlens/ui/components/select";
import { Separator } from "@promptlens/ui/components/separator";
import { Skeleton } from "@promptlens/ui/components/skeleton";

export function App() {
  const [modelStatus, setModelStatus] = useState<{
    configured: boolean;
    modelId: string | null;
  } | null>(null);

  useEffect(() => {
    fetchActiveModel();

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

  const handleModelChange = (newModelId: string) => {
    if (!newModelId) return;

    chrome.runtime.sendMessage(
      {
        type: "SET_ACTIVE_MODEL",
        payload: { modelId: newModelId },
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

  return (
    <div className="w-80 border border-border bg-background">
      <Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PromptLens" className="size-5 grayscale" />
            <div className="flex flex-col gap-0.5 leading-none">
              <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                PromptLens
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
                  {providers.map((provider) => (
                    <SelectGroup key={provider.id}>
                      <SelectLabel>{provider.name}</SelectLabel>
                      {provider.models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
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

          <section className="flex flex-col gap-2 px-4 py-3">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Links
            </p>
            <div className="grid gap-2">
              <Button variant="outline" className="justify-start gap-2">
                <BarChart3 data-icon="inline-start" />
                Dashboard
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <Users data-icon="inline-start" />
                Community
              </Button>
            </div>
          </section>
        </CardContent>

        <CardFooter className="justify-between px-4 py-2">
          <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            PromptLens
          </p>
          <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            v1.0.0
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
