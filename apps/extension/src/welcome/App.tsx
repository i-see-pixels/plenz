import type { ReactNode } from "react";
import logo from "../assets/logo.svg";
import { AuthStatus } from "../components/AuthStatus";
import { ModelConfig } from "../components/ModelConfig";
import { useSetupState } from "../components/useSetupState";
import { SETUP_MESSAGES } from "../shared/setup";
import { Button } from "@plenz/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@plenz/ui/components/card";
import { cn } from "@plenz/ui/lib/utils";
import { Check } from "lucide-react";

const CHAT_SITES = [
  { name: "ChatGPT", url: "https://chatgpt.com/" },
  { name: "Claude", url: "https://claude.ai/new" },
  { name: "Gemini", url: "https://gemini.google.com/app" },
  { name: "Perplexity", url: "https://www.perplexity.ai/" },
];

const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? "Cmd" : "Ctrl";

function Step({
  number,
  done,
  title,
  description,
  children,
}: {
  number: number;
  done?: boolean;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-md border-border py-0 shadow-none">
      <CardHeader className="flex flex-row items-start gap-3 border-b border-border px-4 py-4">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold",
            done ? "border-accent-signal bg-accent-signal text-background" : "border-border",
          )}
          aria-label={done ? `Step ${number}, done` : `Step ${number}`}
        >
          {done ? <Check className="size-4" /> : number}
        </span>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4">{children}</CardContent>
    </Card>
  );
}

/**
 * First run: connect a model, try it on a chat site, optionally sign in.
 * Opened once on install; the popup links back here until a model works.
 */
export function App() {
  const state = useSetupState();
  const ready = state === "provider" || state === "on-device";

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="size-9" />
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome to plenz</h1>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            plenz checks your prompts as you type in AI chats and rewrites them when you ask.
            Two minutes of setup and you're done.
          </p>
          <p
            role="status"
            data-setup-state={state}
            className={cn(
              "rounded-sm border px-3 py-2 text-sm",
              ready ? "border-border bg-muted" : "border-accent-signal",
            )}
          >
            {state === "checking" ? "Checking your setup…" : SETUP_MESSAGES[state]}
          </p>
        </header>

        <Step
          number={1}
          done={ready}
          title="Connect an AI model"
          description="Pick a provider and paste your API key. It stays in your browser unless you turn on Cloud Sync. A local server (as a Custom Provider) or Chrome's built-in model needs no key."
        >
          <ModelConfig />
        </Step>

        <Step
          number={2}
          title="Try it in a chat"
          description="plenz works on these sites out of the box. Other sites can be turned on from the toolbar popup."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {CHAT_SITES.map((site) => (
                <Button key={site.name} variant="outline" asChild>
                  <a href={site.url} target="_blank" rel="noreferrer">
                    {site.name}
                  </a>
                </Button>
              ))}
            </div>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed">
              <li>Type a prompt. A small badge by the chat box shows its score.</li>
              <li>
                Click the badge or press <kbd className="font-mono text-xs">{MOD}+Shift+Enter</kbd> to
                pick a rewrite, then <kbd className="font-mono text-xs">Tab</kbd> to use it.
              </li>
              <li>
                Type <kbd className="font-mono text-xs">/</kbd> on a new line to insert a saved prompt or
                context card.
              </li>
            </ol>
          </div>
        </Step>

        <Step
          number={3}
          title="Sign in (optional)"
          description="Sync your API keys across devices, encrypted with a passphrase only you know, and save prompts from the gallery."
        >
          <div className="max-w-sm">
            <AuthStatus />
          </div>
        </Step>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>Everything else, like context cards and preferences, is in settings.</p>
          <Button variant="outline" size="sm" onClick={() => chrome.runtime.openOptionsPage()}>
            Open settings
          </Button>
        </footer>
      </main>
    </div>
  );
}
