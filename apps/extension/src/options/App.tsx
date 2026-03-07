import logo from "../assets/logo.svg";
import { AuthStatus } from "../components/AuthStatus";
import { ModelConfig } from "../components/ModelConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@promptlens/ui/components/card";
import { Input } from "@promptlens/ui/components/input";
import { Label } from "@promptlens/ui/components/label";

export function App() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="PromptLens"
              className="size-10 grayscale transition-all duration-300 hover:grayscale-0"
            />
            <h1 className="text-3xl font-bold tracking-tight">PromptLens Settings</h1>
          </div>
          <div className="sm:min-w-[250px]">
            <AuthStatus />
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase">
              Model Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ModelConfig />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm tracking-widest text-muted-foreground uppercase">
              General Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Label htmlFor="debounce">Debounce Time (ms)</Label>
              <Input id="debounce" type="number" defaultValue={500} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
