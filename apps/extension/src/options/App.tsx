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
import { Input } from "@promptlens/ui/components/input";
import { Label } from "@promptlens/ui/components/label";

export function App() {
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
            <div className="grid gap-3 px-3 py-3 sm:grid-cols-[220px_1fr] sm:items-center">
              <Label
                htmlFor="debounce"
                className="font-mono text-[11px] tracking-[0.14em] uppercase"
              >
                Debounce time (ms)
              </Label>
              <Input id="debounce" type="number" defaultValue={500} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
