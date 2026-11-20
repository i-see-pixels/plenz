import { Card } from "@plenz/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@plenz/ui/components/select";
import { Switch } from "@plenz/ui/components/switch";
import { cn } from "@plenz/ui/lib/utils";
import { useEffect, useRef, useState } from "preact/hooks";
import type { ReactNode } from "react";
import logo from "../assets/logo.svg";
import { AuthStatus } from "../components/AuthStatus";
import { ContextCards } from "../components/ContextCards";
import { LocalLearning } from "../components/LocalLearning";
import { ModelConfig } from "../components/ModelConfig";
import { isRpcFailure, sendRpc } from "../shared/rpc";
import type { ThemePreference } from "../shared/theme-preference";

const PREFERENCES_STORAGE_KEY = "preferences";

type Preferences = {
  debounceTime: number;
  suggestionsEnabled: boolean;
  chatContextEnabled: boolean;
  providerFallbackEnabled: boolean;
  autoRefineEnabled: boolean;
  theme: ThemePreference;
};

const DEFAULTS: Preferences = {
  debounceTime: 500,
  suggestionsEnabled: true,
  chatContextEnabled: false,
  providerFallbackEnabled: false,
  autoRefineEnabled: false,
  theme: "system",
};

const WAIT_CHOICES = [
  { ms: 500, label: "Half a second" },
  { ms: 1000, label: "1 second" },
  { ms: 2000, label: "2 seconds" },
];

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const SECTIONS = [
  { id: "model", title: "AI model" },
  { id: "refining", title: "Refining" },
  { id: "appearance", title: "Appearance" },
  { id: "cards", title: "Context cards" },
  { id: "learning", title: "Learned from use" },
];

type SaveStatus =
  | { kind: "idle" | "saving" | "saved" }
  | { kind: "error"; message: string };
type SavingSection = "refining" | "appearance";

function Section({
  id,
  title,
  description,
  aside,
  children,
}: {
  id: string;
  title: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <Card className="gap-0 rounded-md border-border py-0 shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-4">
          <div className="flex flex-col gap-1">
            <h2 id={`${id}-title`} className="text-base font-semibold">
              {title}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          {aside}
        </header>
        <div className="px-4 py-4">{children}</div>
      </Card>
    </section>
  );
}

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
  children,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-border px-3 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
          <p
            id={`${id}-description`}
            className="text-xs leading-relaxed text-muted-foreground"
          >
            {description}
          </p>
        </div>
        <Switch
          id={id}
          checked={checked}
          aria-describedby={`${id}-description`}
          onCheckedChange={onChange}
          className="mt-0.5"
        />
      </div>
      {children}
    </div>
  );
}

export function App() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  // Only the section that was just changed reports the save.
  const [statusSection, setStatusSection] = useState<SavingSection | null>(
    null,
  );
  // One save at a time, in order, so quick changes can't overwrite each other.
  const saving = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    void sendRpc("GET_PREFERENCES").then((reply) => {
      if (isRpcFailure(reply)) {
        setStatusSection("refining");
        setStatus({ kind: "error", message: reply.error });
        return;
      }
      setPrefs({
        debounceTime: reply.debounceTime,
        suggestionsEnabled: reply.suggestionsEnabled,
        chatContextEnabled: reply.chatContextEnabled,
        providerFallbackEnabled: reply.providerFallbackEnabled,
        autoRefineEnabled: reply.autoRefineEnabled,
        theme: reply.theme,
      });
    });
  }, []);

  /** Changes save as they're made; the local copy is what chat pages read. */
  const save = (
    patch: Partial<Preferences>,
    section: SavingSection = "refining",
  ) => {
    setPrefs((current) => ({ ...current, ...patch }));
    setStatusSection(section);
    setStatus({ kind: "saving" });
    saving.current = saving.current.then(async () => {
      try {
        const reply = await sendRpc("SET_PREFERENCES", { preferences: patch });
        if (isRpcFailure(reply)) throw new Error(reply.error);
        const stored = await chrome.storage.local.get(PREFERENCES_STORAGE_KEY);
        await chrome.storage.local.set({
          [PREFERENCES_STORAGE_KEY]: {
            ...(stored[PREFERENCES_STORAGE_KEY] as object | undefined),
            ...reply.preferences,
            // Older copies also carry debounceMs, which chat pages read first.
            debounceMs: reply.preferences.debounceTime,
          },
        });
        setStatus({ kind: "saved" });
      } catch (error) {
        setStatus({
          kind: "error",
          message: (error as Error).message || "Couldn't save.",
        });
      }
    });
  };

  const waitChoices = WAIT_CHOICES.some(
    (choice) => choice.ms === prefs.debounceTime,
  )
    ? WAIT_CHOICES
    : [
        ...WAIT_CHOICES,
        { ms: prefs.debounceTime, label: `${prefs.debounceTime} ms` },
      ];

  const saveNote = (section: SavingSection) => {
    const shown: SaveStatus =
      statusSection === section ? status : { kind: "idle" };
    return (
      <p
        role="status"
        className={cn(
          "text-xs",
          shown.kind === "error" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {shown.kind === "saving"
          ? "Saving…"
          : shown.kind === "saved"
            ? "Saved"
            : shown.kind === "error"
              ? `Couldn't save: ${shown.message}`
              : "Changes save automatically"}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Card className="grid gap-4 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="size-9" />
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              plenz settings
            </h1>
          </div>
          <div className="w-full sm:w-[260px]">
            <AuthStatus />
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
          <nav
            aria-label="Settings sections"
            className="lg:sticky lg:top-6 lg:self-start"
          >
            <ul className="flex gap-1 overflow-x-auto lg:flex-col">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block whitespace-nowrap rounded-sm px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <main className="flex min-w-0 flex-col gap-6">
            <Section
              id="model"
              title="AI model"
              description="The provider and model plenz uses to rewrite prompts. Keys stay in your browser unless you turn on Cloud Sync."
            >
              <ModelConfig />
            </Section>

            <Section
              id="refining"
              title="Refining"
              description="How plenz behaves on chat sites."
              aside={saveNote("refining")}
            >
              <div className="grid gap-3">
                <Toggle
                  id="suggestions-enabled"
                  label="Show plenz on chat sites"
                  description="The score badge, refine panel and / menu. Turn off to pause plenz everywhere."
                  checked={prefs.suggestionsEnabled}
                  onChange={(checked) => save({ suggestionsEnabled: checked })}
                />
                <Toggle
                  id="auto-refine"
                  label="Refine automatically while typing"
                  description="Off: your provider is only called when you click the badge or press Ctrl/Cmd+Shift+Enter. On: plenz also refines each time you pause, and each refine is a billed call."
                  checked={prefs.autoRefineEnabled}
                  onChange={(checked) => save({ autoRefineEnabled: checked })}
                >
                  {prefs.autoRefineEnabled ? (
                    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
                      <span
                        id="wait-label"
                        className="text-xs text-muted-foreground"
                      >
                        Refine after a pause of
                      </span>
                      <Select
                        value={String(prefs.debounceTime)}
                        onValueChange={(value) =>
                          save({ debounceTime: Number(value) })
                        }
                      >
                        <SelectTrigger
                          aria-labelledby="wait-label"
                          className="w-40"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {waitChoices.map((choice) => (
                            <SelectItem
                              key={choice.ms}
                              value={String(choice.ms)}
                            >
                              {choice.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </Toggle>
                <Toggle
                  id="chat-context"
                  label="Use the current conversation"
                  description="Send relevant recent messages and a short summary with each refine, so rewrites fit the chat."
                  checked={prefs.chatContextEnabled}
                  onChange={(checked) => save({ chatContextEnabled: checked })}
                />
                <Toggle
                  id="provider-fallback"
                  label="Fall back to other providers"
                  description="If the active provider fails, retry with your other configured providers. Your prompt goes to those providers too, and each may bill you."
                  checked={prefs.providerFallbackEnabled}
                  onChange={(checked) =>
                    save({ providerFallbackEnabled: checked })
                  }
                />
              </div>
            </Section>

            <Section
              id="appearance"
              title="Appearance"
              description="For plenz's popup, settings and gallery. On chat sites, plenz matches the site."
              aside={saveNote("appearance")}
            >
              <fieldset
                aria-labelledby="appearance-title"
                className="inline-flex rounded-sm border border-border p-0.5"
              >
                {THEMES.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    aria-pressed={prefs.theme === theme.value}
                    onClick={() => save({ theme: theme.value }, "appearance")}
                    className={cn(
                      "rounded-[3px] px-4 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring",
                      prefs.theme === theme.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {theme.label}
                  </button>
                ))}
              </fieldset>
            </Section>

            <Section
              id="cards"
              title="Context cards"
              description="Saved notes you can add to any draft with one click."
            >
              <ContextCards />
            </Section>

            <Section
              id="learning"
              title="Learned from use"
              description="How plenz adapts to the way you work, on this device only."
            >
              <LocalLearning />
            </Section>
          </main>
        </div>
      </div>
    </div>
  );
}
