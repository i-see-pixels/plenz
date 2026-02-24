"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Chrome, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function CTA() {
  return (
    <section id="download" className="relative px-6 py-24 sm:py-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px] animate-glow-pulse" />
      </div>

      <motion.div
        className="relative z-10 mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Stop under-prompting. <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-primary to-violet-soft bg-clip-text text-transparent">
            Start getting better answers.
          </span>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          Join thousands of users who write better prompts with PromptLens.
          Free, open source, and privacy-first.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            asChild
            className="h-14 gap-2.5 rounded-full bg-primary px-8 text-base font-semibold hover:bg-primary/80 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            <Link
              href="https://chromewebstore.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Chrome className="size-5" />
              Add to Chrome — It&apos;s Free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground/60">
          No account required · Works with any LLM · MIT License
        </p>
      </motion.div>
    </section>
  );
}
