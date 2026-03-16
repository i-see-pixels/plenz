"use client";

import Link from "next/link";
import { Button } from "@promptlens/ui/components/button";
import { Badge } from "@promptlens/ui/components/badge";
import { ArrowRight, Chrome, Github } from "lucide-react";

export function Hero() {
  return (
    <section id="top" className="border-b border-border px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <Badge
            variant="outline"
            className="rounded-sm border-[color:var(--accent-signal)] font-mono text-[10px] tracking-[0.15em] text-[color:var(--accent-signal)] uppercase"
          >
            Open source - Privacy first
          </Badge>

          <div className="flex flex-col gap-4">
            <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Real-time prompt diagnostics
            </p>
            <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Rewrite weak prompts before you send them.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              PromptLens scans your input inline, proposes higher-precision alternatives, and keeps
              your keys and prompt data local to your browser.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link
                href="https://chromewebstore.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Chrome data-icon="inline-start" />
                Add to Chrome
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link
                href="https://github.com/i-see-pixels/promptlens"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github data-icon="inline-start" />
                View source
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-0 rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Live preview
            </p>
            <Badge
              variant="outline"
              className="rounded-sm border-[color:var(--accent-signal)] font-mono text-[10px] tracking-[0.12em] text-[color:var(--accent-signal)] uppercase"
            >
              Active
            </Badge>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="rounded-sm border border-border bg-background px-3 py-3">
              <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Draft
              </p>
              <p className="mt-1 text-sm text-foreground">write me an email to my manager</p>
            </div>

            <div className="rounded-sm border border-[color:var(--accent-signal)] bg-muted px-3 py-3">
              <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[color:var(--accent-signal)] uppercase">
                PromptLens recommendation
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                Write a concise professional email to my manager requesting PTO from March 10 to
                March 14. Include a clear subject line and confirm coverage.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                <kbd className="rounded-sm border border-border bg-background px-1.5 py-0.5">
                  Tab
                </kbd>
                accept
                <kbd className="rounded-sm border border-border bg-background px-1.5 py-0.5">
                  Esc
                </kbd>
                dismiss
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

