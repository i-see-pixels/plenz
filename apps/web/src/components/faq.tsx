import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function FAQ() {
  return (
    <section id="faq" className="border-b border-border px-4 py-14 sm:px-6 sm:py-18">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3 border border-border bg-card px-4 py-5 sm:px-6">
          <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Use cases and FAQ
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Clear answers for setup, privacy, and fit.
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            PromptLens is built for people who refine prompts all day and want clearer output
            without changing their existing workflow. Start with the{" "}
            <Link
              href={siteConfig.routes.gettingStarted}
              className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent-signal"
            >
              setup guide
            </Link>{" "}
            and compare{" "}
            <Link
              href="/#platforms"
              className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent-signal"
            >
              supported AI surfaces
            </Link>{" "}
            before you install.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {siteConfig.homepageFaqs.map((item) => (
            <article
              key={item.question}
              className="flex h-full flex-col gap-4 rounded-md border border-border bg-card px-4 py-5"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold leading-tight">{item.question}</h3>
                <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Answer
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
              {item.links?.length ? (
                <div className="flex flex-wrap gap-3 pt-1">
                  {item.links.map((link) => (
                    <Link
                      key={`${item.question}-${link.href}`}
                      href={link.href}
                      className="font-mono text-[11px] font-semibold tracking-[0.16em] text-foreground uppercase transition-colors hover:text-accent-signal"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
