"use client";

import { Download, Settings, Zap } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Download,
    title: "Install extension",
    description:
      "Add plenz to Chrome and pin it. The popup and options surfaces are ready immediately.",
  },
  {
    number: "02",
    icon: Settings,
    title: "Connect model provider",
    description:
      "Choose provider, add key, test connection, and set an active model in one bordered config flow.",
  },
  {
    number: "03",
    icon: Zap,
    title: "Draft with guidance",
    description:
      "plenz annotates weak prompts in-context and lets you accept rewrites from the keyboard.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-b border-border px-4 py-14 sm:px-6 sm:py-18"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3 border border-border bg-card px-4 py-5 sm:px-6">
          <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Setup sequence
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Operational in under one minute.
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            The onboarding path prioritizes fast activation: install, configure,
            then draft with immediate inline feedback.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="flex flex-col gap-4 rounded-md border border-border bg-card px-4 py-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-sm border border-border bg-muted">
                  <step.icon className="size-4" />
                </div>
                <span className="rounded-sm border border-accent-signal px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-accent-signal uppercase">
                  {step.number}
                </span>
              </div>
              <h3 className="text-lg font-semibold leading-tight">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

