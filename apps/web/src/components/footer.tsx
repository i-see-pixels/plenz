import Link from "next/link";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Github } from "lucide-react";
import PromptLensLogo from "@/assets/PromptLensLogo.svg";

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
    <footer className="border-t border-border/40 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src={PromptLensLogo}
                alt="PromptLens"
                width={24}
                height={24}
              />
              <span className="text-base font-semibold tracking-tight">
                PromptLens
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Open-source AI prompt refinement — like Grammarly, but for your AI
              conversations.
            </p>
            <Link
              href="https://github.com/i-see-pixels/promptlens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="size-4" />
              Star on GitHub
            </Link>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="mb-4 text-sm font-semibold">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      {...(link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8 bg-border/40" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} PromptLens. MIT License.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Made with purpose. Open to everyone.
          </p>
        </div>
      </div>
    </footer>
  );
}
