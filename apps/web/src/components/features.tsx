"use client";

import { Card, CardContent } from "@plenz/ui/components/card";
import {
  Cpu,
  Gauge,
  GitCompare,
  Globe,
  Keyboard,
  LibraryBig,
  ShieldCheck,
  Sparkles,
  SquareSlash,
} from "lucide-react";

const features = [
  {
    icon: Gauge,
    title: "Free prompt check",
    description:
      "A score and chips like \"No output format\" appear while you type. The check runs locally, with no API call.",
  },
  {
    icon: Sparkles,
    title: "Refine on demand",
    description:
      "Pick Improve, Tighten, Structure, or Ask me. The rewrite streams in as it's written, and nothing calls a model until you ask.",
  },
  {
    icon: GitCompare,
    title: "See every change",
    description:
      "A word-level diff lets you keep your own wording for any change, then replace the draft in one click, with Undo.",
  },
  {
    icon: SquareSlash,
    title: "Context cards and /",
    description:
      "Save notes you keep retyping. Type / in the chat box to insert a card, a saved prompt, or a trending one.",
  },
  {
    icon: LibraryBig,
    title: "Prompt Gallery",
    description:
      "Browse trending and new prompts in the side panel. Sign in with Google to save your own and reuse them anywhere.",
  },
  {
    icon: Cpu,
    title: "On-device or your own key",
    description:
      "Refine with Chrome's built-in Gemini Nano and no key, where your device supports it. Or connect OpenAI, Anthropic, Gemini, Mistral, Groq, OpenRouter, or a local model.",
  },
  {
    icon: ShieldCheck,
    title: "Local-first privacy",
    description:
      "Keys stay in your browser. plenz learns which modes you prefer on your device only. Optional Cloud Sync encrypts keys with your passphrase.",
  },
  {
    icon: Globe,
    title: "Any chat box",
    description:
      "Built for ChatGPT, Claude, Gemini, and Perplexity, and you can turn it on for any other site from the popup.",
  },
  {
    icon: Keyboard,
    title: "Keyboard flow",
    description:
      "Press Ctrl/Cmd+Shift+Enter to improve your draft, Tab to accept the rewrite, and Esc to close the panel.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border px-4 py-14 sm:px-6 sm:py-18">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3 border border-border bg-card px-4 py-5 sm:px-6">
          <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Capability map
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Technical UX, not decorative UX.
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every panel is flat, border-defined, and information-dense so state and actions remain
            obvious under extension-sized constraints.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full gap-0 rounded-md border-border bg-card py-0 shadow-none">
              <CardContent className="flex h-full flex-col gap-3 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-sm border border-border bg-muted">
                    <feature.icon className="size-4" />
                  </div>
                  <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Module
                  </p>
                </div>
                <h3 className="text-base font-semibold leading-tight">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

