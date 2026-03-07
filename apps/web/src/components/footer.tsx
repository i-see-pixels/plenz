import Link from "next/link";
import Image from "next/image";
import { Separator } from "@promptlens/ui/components/separator";
import { Github } from "lucide-react";
import logo from "@/assets/logo.svg";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterGroup {
  title: string;
  links: FooterLink[];
}

const footerLinks: FooterGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Download", href: "#download" },
    ],
  },
  {
    title: "Developers",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/i-see-pixels/promptlens",
        external: true,
      },
      {
        label: "Contributing",
        href: "https://github.com/i-see-pixels/promptlens/blob/main/DEVELOPMENT.md",
        external: true,
      },
      {
        label: "Issues",
        href: "https://github.com/i-see-pixels/promptlens/issues",
        external: true,
      },
    ],
  },
  {
    title: "Legal",
    links: [
      {
        label: "MIT License",
        href: "https://github.com/i-see-pixels/promptlens/blob/main/LICENSE",
        external: true,
      },
      {
        label: "Security",
        href: "https://github.com/i-see-pixels/promptlens/blob/main/SECURITY.md",
        external: true,
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 rounded-md border border-border bg-card px-4 py-6 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image src={logo} alt="PromptLens" width={24} height={24} className="grayscale" />
              <span className="text-base font-semibold tracking-tight">PromptLens</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Open-source AI prompt refinement built for fast, keyboard-first iteration.
            </p>
            <Link
              href="https://github.com/i-see-pixels/promptlens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="size-4" />
              Star on GitHub
            </Link>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <h4 className="font-mono text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {group.title}
              </h4>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      {...(link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="text-sm text-foreground/90 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            (c) {new Date().getFullYear()} PromptLens - MIT License
          </p>
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Blueprint style system - Light-first rollout
          </p>
        </div>
      </div>
    </footer>
  );
}

