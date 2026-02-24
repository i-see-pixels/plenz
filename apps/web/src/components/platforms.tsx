"use client";

import { motion } from "framer-motion";
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
    width: 100,
    height: 100,
    link: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Claude_AI_logo.svg",
  },
  {
    name: "Gemini",
    width: 100,
    height: 100,
    link: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Google_Gemini_logo_2025.svg",
  },
  {
    name: "Perplexity",
    width: 100,
    height: 100,
    link: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Perplexity_AI_logo.svg",
  },
];

export function Platforms() {
  return (
    <section id="platforms" className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Works where you{" "}
            <span className="text-muted-foreground">already work.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            PromptLens automatically detects AI chat inputs on all major
            platforms.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="group flex items-center gap-3 rounded-xl border border-border/40 bg-white px-6 py-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:bg-white/90"
            >
              <Image
                src={platform.link}
                alt={platform.name}
                width={platform.width}
                height={platform.height}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
