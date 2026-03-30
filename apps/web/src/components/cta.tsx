"use client";

import Link from "next/link";
import { Button } from "@promptlens/ui/components/button";
import { ArrowRight } from "lucide-react";
import { FaChrome } from "react-icons/fa";
import { siteConfig } from "@/lib/site";

export function CTA() {
  return (
    <section
      id="download"
      className="border-b border-border px-4 py-14 sm:px-6 sm:py-18"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 rounded-md border border-border bg-card px-4 py-6 text-left sm:px-6">
          <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-accent-signal uppercase">
            Deploy now
          </p>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Ship better prompts on the first draft.
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            PromptLens is free, open source, and ready for immediate use with
            your own provider key.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link
                href={siteConfig.links.chromeWebStore}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaChrome data-icon="inline-start" />
                Add to Chrome
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Need a quick walkthrough first? Read the{" "}
            <Link
              href={siteConfig.routes.gettingStarted}
              className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent-signal"
            >
              setup guide
            </Link>{" "}
            or review the{" "}
            <Link
              href="/#platforms"
              className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent-signal"
            >
              supported AI surfaces
            </Link>
            .
          </p>

          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            No account required - BYOK - MIT license
          </p>
        </div>
      </div>
    </section>
  );
}
