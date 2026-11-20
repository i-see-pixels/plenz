"use client";

import React, { forwardRef, useRef } from "react";
import { Globe } from "lucide-react";
import Image from "next/image";
import { cn } from "@plenz/ui/lib/utils";
import { AnimatedBeam } from "@plenz/ui/components/animated-beam";

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
    width: 120,
    height: 120,
    link: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Perplexity_AI_logo.svg",
  },
];

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex shrink-0 w-24 sm:w-32 h-12 sm:h-16 items-center justify-center rounded-md border border-border bg-card sm:px-5 shadow-lg",
        className,
      )}
    >
      {children}
    </div>
  );
});
Circle.displayName = "Circle";

export function Platforms() {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);
  const div3Ref = useRef<HTMLDivElement>(null);
  const div4Ref = useRef<HTMLDivElement>(null); // plenz center
  const div5Ref = useRef<HTMLDivElement>(null);
  const div6Ref = useRef<HTMLDivElement>(null);

  return (
    <section
      id="platforms"
      className="border-b border-border px-4 py-14 sm:px-6 sm:py-18 overflow-hidden"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3 border border-border bg-card px-4 py-5 sm:px-6">
          <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Supported surfaces
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Works in your existing AI tabs.
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            plenz runs on ChatGPT, Claude, Gemini, and Perplexity, and
            writes through each site&apos;s own editor. Turn it on for any
            other site from the popup.
          </p>
        </div>

        <div
          className="relative flex h-[300px] sm:h-[400px] w-full items-center justify-center p-2 sm:p-10"
          ref={containerRef}
        >
          <div className="flex size-full flex-row items-stretch justify-between gap-4 sm:gap-10">
            <div className="flex flex-col justify-between">
              <Circle ref={div1Ref}>
                <Image
                  src={platforms[0].link}
                  alt={platforms[0].name}
                  width={40}
                  height={40}
                  className="w-16 h-6 sm:w-full sm:h-full object-contain"
                />
              </Circle>
              <Circle ref={div2Ref}>
                <Image
                  src={platforms[1].link}
                  alt={platforms[1].name}
                  width={40}
                  height={40}
                  className="w-16 h-6 sm:w-full sm:h-full object-contain"
                />
              </Circle>
              <Circle ref={div3Ref}>
                <Image
                  src={platforms[2].link}
                  alt={platforms[2].name}
                  width={40}
                  height={40}
                  className="w-16 h-6 sm:w-full sm:h-full object-contain"
                />
              </Circle>
            </div>

            <div className="flex flex-col justify-center">
              <Circle
                ref={div4Ref}
                className="size-16 sm:size-20 md:size-28 rounded-[32px] overflow-hidden p-2! sm:p-1! border-2"
              >
                <Image
                  src="/icon-512.png"
                  alt="plenz"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </Circle>
            </div>

            <div className="flex flex-col justify-around">
              <Circle ref={div5Ref}>
                <Image
                  src={platforms[3].link}
                  alt={platforms[3].name}
                  width={40}
                  height={40}
                  className="w-16 h-6 sm:w-full sm:h-full object-contain"
                />
              </Circle>
              <Circle
                ref={div6Ref}
                className="w-24 px-2 sm:px-2 gap-1 sm:gap-2"
              >
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
                <div className="flex flex-col">
                  <p className="font-medium sm:leading-4 text-xs sm:text-sm">
                    Any site
                  </p>
                  <p className="text-[6px] sm:text-[10px] text-muted-foreground">
                    Turn on in popup
                  </p>
                </div>
              </Circle>
            </div>
          </div>

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={div1Ref}
            toRef={div4Ref}
            curvature={-75}
            endYOffset={-10}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={div2Ref}
            toRef={div4Ref}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={div3Ref}
            toRef={div4Ref}
            curvature={75}
            endYOffset={10}
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={div5Ref}
            toRef={div4Ref}
            curvature={-75}
            endYOffset={-10}
            reverse
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={div6Ref}
            toRef={div4Ref}
            curvature={75}
            endYOffset={10}
            reverse
          />
        </div>
      </div>
    </section>
  );
}

