"use client";

import Link from "next/link";
import { Button } from "@promptlens/ui/components/button";
import { ArrowRight, Chrome } from "lucide-react";

export function CTA() {
  return (
    <section id="download" className="border-b border-border px-4 py-14 sm:px-6 sm:py-18">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 rounded-md border border-border bg-card px-4 py-6 text-left sm:px-6">
          <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-[color:var(--accent-signal)] uppercase">
            Deploy now
          </p>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Ship better prompts on the first draft.
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            PromptLens is free, open source, and ready for immediate use with your own provider key.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link
                href="https://chromewebstore.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Chrome data-icon="inline-start" />
                Add to Chrome
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>

          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            No account required - BYOK - MIT license
          </p>
        </div>
      </div>
    </section>
  );
}

