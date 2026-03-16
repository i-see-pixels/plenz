"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@promptlens/ui/components/button";
import { Github, Menu, X } from "lucide-react";
import logo from "@/assets/logo.svg";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Platforms", href: "#platforms" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src={logo} alt="PromptLens" width={26} height={26} />
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="text-lg font-semibold tracking-tight">
              PromptLens
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm border border-transparent px-3 py-2 font-mono text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:border-border hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm" asChild>
            <Link
              href="https://github.com/i-see-pixels/promptlens"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github data-icon="inline-start" />
              GitHub
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="#download">Add to Chrome</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-sm border border-border text-foreground md:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-sm border border-border px-3 py-2 font-mono text-[11px] font-semibold tracking-[0.16em] text-foreground uppercase"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-1">
              <Button variant="outline" size="sm" asChild>
                <Link
                  href="https://github.com/i-see-pixels/promptlens"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github data-icon="inline-start" />
                  GitHub
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="#download">Add to Chrome</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
