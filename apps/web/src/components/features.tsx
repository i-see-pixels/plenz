"use client";

import { Card, CardContent } from "@promptlens/ui/components/card";
import { Code2, Globe, Key, Keyboard, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Inline suggestions",
    description:
      "PromptLens flags vague phrasing in real time and offers stronger rewrites before you hit enter.",
  },
  {
    icon: Key,
    title: "Bring your own key",
    description:
      "Use OpenAI, Gemini, Anthropic, Mistral, Groq, OpenRouter, or local models from one control plane.",
  },
  {
    icon: ShieldCheck,
    title: "Local-first privacy",
    description:
      "API keys and prompt text stay in your browser storage. No PromptLens relay service in the middle.",
  },
  {
    icon: Globe,
    title: "Platform coverage",
    description:
      "Runs across major AI chat surfaces with automatic input detection and low-friction defaults.",
  },
  {
    icon: Code2,
    title: "Open source stack",
    description:
      "MIT licensed codebase with readable extension internals and no hidden premium behavior.",
  },
  {
    icon: Keyboard,
    title: "Keyboard flow",
    description:
      "Accept and dismiss suggestions with fast key chords to keep your drafting loop uninterrupted.",
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
