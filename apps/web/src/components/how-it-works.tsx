"use client";

import { motion } from "framer-motion";
import { Download, Settings, Zap } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Download,
    title: "Install the Extension",
    description:
      "Add PromptLens to Chrome with one click. It's free, open source, and takes under 10 seconds.",
  },
  {
    number: "02",
    icon: Settings,
    title: "Connect Your LLM",
    description:
      "Choose your provider (OpenAI, Gemini, etc.), paste your API key, and test the connection. Your key stays local.",
  },
  {
    number: "03",
    icon: Zap,
    title: "Start Prompting Better",
    description:
      "Open any AI chat and start typing. PromptLens analyzes your prompt and suggests improvements in real time.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Up and running in{" "}
            <span className="text-primary">under a minute.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three simple steps to transform your AI conversations.
          </p>
        </motion.div>

        <motion.div
          className="relative grid gap-8 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Connecting line (desktop) */}
          <div className="pointer-events-none absolute left-0 right-0 top-14 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />

          {steps.map((step) => (
            <motion.div
              key={step.number}
              className="relative flex flex-col items-center text-center"
              variants={itemVariants}
            >
              {/* Step circle */}
              <div className="relative mb-6">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <step.icon className="size-6 text-primary" />
                </div>
                <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {step.number}
                </span>
              </div>

              <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
