"use client";

import { Card, CardContent } from "@promptlens/ui/components/card";
import {
  Sparkles,
  Key,
  ShieldCheck,
  Globe,
  Code2,
  Keyboard,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Sparkles,
    title: "Inline Suggestions",
    description:
      "Get real-time prompt refinement as you type in any AI chat. Suggestions appear as elegant ghost text or a compact popover.",
  },
  {
    icon: Key,
    title: "Bring Your Own Key",
    description:
      "Use any LLM provider — OpenAI, Google Gemini, Anthropic, Mistral, Groq, or OpenRouter. No vendor lock-in, no subscription.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy First",
    description:
      "Your API keys and prompt data never leave your browser. Zero data sent to any PromptLens server. Ever.",
  },
  {
    icon: Globe,
    title: "Multi-Platform",
    description:
      "Works on ChatGPT, Claude, Gemini, Perplexity, Copilot, and more. Automatic detection, zero configuration.",
  },
  {
    icon: Code2,
    title: "Open Source",
    description:
      "MIT licensed and community-driven. Read the code, contribute features, or fork it for your own needs.",
  },
  {
    icon: Keyboard,
    title: "Keyboard-First",
    description:
      "Tab to accept, Esc to dismiss, arrows to navigate alternatives. Designed for speed, not clicks.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Features() {
  return (
    <section id="features" className="relative px-6 py-24 sm:py-32">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need.{" "}
            <span className="text-muted-foreground">
              Nothing you don&apos;t.
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built for privacy, speed, and flexibility — with zero paywall.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card className="group h-full border-border/40 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:bg-card/60 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

