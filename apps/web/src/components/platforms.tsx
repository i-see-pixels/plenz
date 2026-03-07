"use client";

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
    name: "Perplexity",
    width: 96,
    height: 96,
    link: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Perplexity_AI_logo.svg",
  },
];

export function Platforms() {
  return (
    <section id="platforms" className="border-b border-border px-4 py-14 sm:px-6 sm:py-18">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3 border border-border bg-card px-4 py-5 sm:px-6">
          <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Supported surfaces
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Works in your existing AI tabs.
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            PromptLens detects target input areas and injects suggestions without changing your host
            platform workflow.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-5"
            >
              <Image src={platform.link} alt={platform.name} width={platform.width} height={platform.height} />
              <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {platform.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
