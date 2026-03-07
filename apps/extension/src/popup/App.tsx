import { useState, useEffect } from "preact/hooks";
import logo from "../assets/logo.svg";
import { providers } from "@promptlens/providers";
import { AuthStatus } from "../components/AuthStatus";
import { BarChart3, Settings, Users } from "lucide-react";
import { Badge } from "@promptlens/ui/components/badge";
import { Button } from "@promptlens/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader } from "@promptlens/ui/components/card";
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
    <div className="w-80">
      <Card className="gap-0 rounded-none border-none py-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="PromptLens" className="size-5 grayscale" />
            <h1 className="text-base font-semibold tracking-tight">PromptLens</h1>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={openSettings}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings className="size-4" />
          </Button>
        </CardHeader>

        <CardContent className="px-0 py-0">
          <div className="px-4 py-3">
            <AuthStatus />
          </div>

          <Separator />

          <section className="flex flex-col gap-3 px-4 py-3">
            <h2 className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Active Model
            </h2>
            {modelStatus ? (
              <div className="flex items-center gap-2">
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
                {modelStatus.configured ? (
                  <Badge variant="secondary" className="font-mono text-[9px] uppercase">
                    Active
                  </Badge>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-full" />
              </div>
            )}
          </section>

          {!modelStatus?.configured ? (
            <>
              <Separator />
              <div className="flex flex-col gap-3 bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium">
                  Setup your model to enable real-time prompt enhancement.
                </p>
                <Button onClick={openSettings}>Configure now</Button>
              </div>
            </>
          ) : null}

          <Separator />

          <div className="flex flex-col gap-1 p-2">
            <Button variant="ghost" className="justify-start gap-3">
              <BarChart3 className="size-4 text-muted-foreground" />
              Dashboard
            </Button>
            <Button variant="ghost" className="justify-start gap-3">
              <Users className="size-4 text-muted-foreground" />
              Community
            </Button>
          </div>
        </CardContent>

        <CardFooter className="justify-center border-t px-3 py-2">
          <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            PromptLens · v1.0.0
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

