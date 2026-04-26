"use client";

import Link from "next/link";
import { Button } from "@plenz/ui/components/button";
import { Badge } from "@plenz/ui/components/badge";
import { ArrowRight } from "lucide-react";
import { FaChrome, FaGithub } from "react-icons/fa";
import { siteConfig } from "@/lib/site";
import PromoVideo from "./promo-video";

export function Hero() {
  return (
    <section
      id="top"
      className="border-b border-border px-4 py-14 sm:px-6 sm:py-20"
    >
      <a
        href="https://www.producthunt.com/products/plenz?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-plenz"
        target="_blank"
        rel="noopener noreferrer"
        className="flex justify-center"
      >
        <img
          alt="plenz - ai prompt refiner | Product Hunt"
          width="250"
          height="54"
          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1132810&amp;theme=light&amp;t=1777214886351"
        />
      </a>
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <Badge
            variant="outline"
            className="rounded-sm border-accent-signal font-mono text-[10px] tracking-[0.15em] text-accent-signal uppercase lg:w-max"
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
              plenz scans your input inline, proposes higher-precision
              alternatives, and keeps your keys and prompt data local to your
              browser.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link
                href={siteConfig.links.chromeWebStore}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaChrome data-icon="inline-start" />
                Add to Chrome
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaGithub data-icon="inline-start" />
                View source
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Need setup details first? Follow the{" "}
            <Link
              href={siteConfig.routes.gettingStarted}
              className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent-signal"
            >
              plenz setup guide
            </Link>{" "}
            or jump straight to the{" "}
            <Link
              href="/getting-started#providers"
              className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent-signal"
            >
              provider connection steps
            </Link>
            .
          </p>
        </div>

        <div className="flex w-full items-center justify-center relative">
          <PromoVideo />
        </div>
      </div>
    </section>
  );
}
