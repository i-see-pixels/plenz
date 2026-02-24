"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Chrome, Github, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative flex min-h-[100vh] flex-col items-center justify-center overflow-hidden px-6 pt-16">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-primary/15 blur-[120px] animate-glow-pulse" />
        <div
          className="absolute right-1/4 top-1/2 h-[300px] w-[400px] rounded-full bg-violet-soft/10 blur-[100px] animate-glow-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge
            variant="outline"
            className="mb-8 border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-sm"
          >
            ✨ Open Source · Free Forever
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Your AI prompts,{" "}
          <span className="bg-gradient-to-r from-primary via-violet-soft to-primary bg-clip-text text-transparent">
            refined in real time.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          PromptLens detects vague prompts and suggests improvements inline —
          like Grammarly, but for AI. Bring your own API key, keep your data
          private, and get expert-level AI outputs on the first try.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button
            size="lg"
            asChild
            className="h-12 gap-2.5 rounded-full bg-primary px-7 text-base font-semibold hover:bg-primary/80 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            <Link
              href="https://chromewebstore.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Chrome className="size-5" />
              Add to Chrome — It&apos;s Free
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="h-12 gap-2.5 rounded-full border-border/50 px-7 text-base hover:border-border hover:bg-white/5"
          >
            <Link
              href="https://github.com/promptlens/promptlens"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="size-5" />
              View on GitHub
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </motion.div>

        {/* Demo preview */}
        <motion.div
          className="mt-16 w-full max-w-3xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="relative rounded-xl border border-border/50 bg-card/60 p-1 backdrop-blur-sm shadow-2xl shadow-black/20">
            <div className="rounded-lg bg-background/80 p-6 sm:p-8">
              {/* Fake browser top bar */}
              <div className="mb-6 flex items-center gap-2">
                <div className="size-3 rounded-full bg-red-500/60" />
                <div className="size-3 rounded-full bg-yellow-500/60" />
                <div className="size-3 rounded-full bg-green-500/60" />
                <div className="ml-4 flex-1 rounded-md bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
                  chatgpt.com
                </div>
              </div>

              {/* Prompt input simulation */}
              <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground sm:text-base">
                  <span className="text-foreground">write me an email</span>
                  <span className="animate-pulse text-primary">|</span>
                </p>
              </div>

              {/* Suggestion overlay */}
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-4 backdrop-blur-sm">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
                  <span>⚡</span>
                  PromptLens suggests:
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  &ldquo;Write a professional email to my manager requesting PTO
                  for March 10-14. Use a polite, concise tone. Include a subject
                  line.&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    💡 Added: role, dates, tone, format
                  </span>
                  <span className="ml-auto flex items-center gap-3">
                    <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
                      Tab
                    </kbd>{" "}
                    Accept
                    <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
                      Esc
                    </kbd>{" "}
                    Dismiss
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
