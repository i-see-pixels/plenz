import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Badge } from "@plenz/ui/components/badge";
import { Button } from "@plenz/ui/components/button";
import { getPublicPromptBySlug, isPromptCatalogConfigured } from "@/lib/prompt-catalog";
import {
  createBreadcrumbSchema,
  createPageMetadata,
  serializeJsonLd,
} from "@/lib/seo";
import { siteConfig } from "@/lib/site";

interface PromptPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function formatPublishedDate(value: string | null) {
  if (!value) {
    return "Recently added";
  }

  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return "Recently added";
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedValue);
}

export async function generateMetadata({
  params,
}: PromptPageProps): Promise<Metadata> {
  const { slug } = await params;
  const prompt = await getPublicPromptBySlug(slug);

  if (!prompt) {
    return createPageMetadata({
      title: "Prompt Not Found | plenz",
      description:
        "This public prompt could not be found. Browse plenz to discover more reusable prompts.",
      path: `${siteConfig.routes.prompts}/${slug}`,
    });
  }

  return createPageMetadata({
    title: `${prompt.title} | plenz Prompt Gallery`,
    description: prompt.prompt.slice(0, 160),
    path: `${siteConfig.routes.prompts}/${prompt.slug}`,
  });
}

export default async function PromptSharePage({ params }: PromptPageProps) {
  const { slug } = await params;
  const prompt = await getPublicPromptBySlug(slug);

  if (!prompt) {
    notFound();
  }

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: siteConfig.routes.home },
    { name: "Prompt Gallery", path: siteConfig.routes.prompts },
    { name: prompt.title, path: `${siteConfig.routes.prompts}/${prompt.slug}` },
  ]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      <Navbar />

      <main className="relative z-10 border-b border-border px-4 py-14 sm:px-6 sm:py-18">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(breadcrumbSchema),
          }}
        />

        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <div className="flex flex-col gap-3 border border-border bg-card px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mono-label">Public Prompt</p>
              <Badge
                variant="outline"
                className="rounded-sm border-accent-signal font-mono text-[10px] tracking-[0.12em] text-accent-signal uppercase"
              >
                Shareable
              </Badge>
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {prompt.title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Saved from the plenz editorial prompt catalog. Copy it into your
              workflow or open the extension to keep it in your own library.
            </p>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              <span>Published {formatPublishedDate(prompt.createdAt)}</span>
              <span>Prompt gallery</span>
              {prompt.trendScore !== null ? <span>Trend score {prompt.trendScore}</span> : null}
            </div>
          </div>

          <article className="rounded-md border border-border bg-card px-4 py-6 sm:px-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="mono-label">Prompt</p>
              <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Use as-is or adapt
              </p>
            </div>
            <div className="rounded-sm border border-border bg-background px-4 py-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-foreground sm:text-base">
                {prompt.prompt}
              </p>
            </div>
          </article>

          <div className="flex flex-col gap-4 rounded-md border border-border bg-card px-4 py-6 sm:px-6">
            <p className="mono-label">Use In plenz</p>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Keep this prompt next to ChatGPT, Claude, and Gemini inside the
              plenz side panel so it is ready whenever you need it.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={siteConfig.links.chromeWebStore} target="_blank">
                  Install the extension
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={siteConfig.links.github} target="_blank">
                  View the project
                </Link>
              </Button>
            </div>

            {!isPromptCatalogConfigured() ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                This page needs the Firebase public config in the web app
                environment to resolve shared prompts.
              </p>
            ) : null}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
