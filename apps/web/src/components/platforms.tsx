"use client";

import { BrainCogIcon } from "lucide-react";
import Image from "next/image";

const platforms = [
  {
    name: "ChatGPT",
    width: 80,
    height: 80,
    link: "https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg",
  },
  {
    name: "Claude",
    width: 96,
    height: 96,
    link: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Claude_AI_logo.svg",
  },
  {
    name: "Gemini",
    width: 96,
    height: 96,
    link: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Google_Gemini_logo_2025.svg",
  },
  {
    name: "Mistral",
    width: 120,
    height: 120,
    link: "http://docs.mistral.ai/img/logo.svg",
  },
  {
    name: "OpenRouter",
    width: 120,
    height: 120,
    link: "https://files.buildwithfern.com/openrouter.docs.buildwithfern.com/docs/5a7e2b0bd58241d151e9e352d7a4f898df12c062576c0ce0184da76c3635c5d3/content/assets/logo.svg",
  },
];

export function Platforms() {
  return (
    <section
      id="platforms"
      className="border-b border-border px-4 py-14 sm:px-6 sm:py-18"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3 border border-border bg-card px-4 py-5 sm:px-6">
          <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Supported surfaces
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Works in your existing AI tabs.
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            PromptLens detects target input areas and injects suggestions
            without changing your host platform workflow.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="flex items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-5"
            >
              <Image
                src={platform.link}
                alt={platform.name}
                width={platform.width}
                height={platform.height}
              />
            </div>
          ))}
          <div className="flex items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-5">
            <BrainCogIcon />
            <div className="flex flex-col">
              <p className="font-medium leading-4">Custom</p>
              <p className="text-xs text-muted-foreground">Use your own</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
