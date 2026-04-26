import { FAQ } from "@/components/faq";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { HowItWorks } from "@/components/how-it-works";
import { Platforms } from "@/components/platforms";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";
import {
  createFaqSchema,
  createPageMetadata,
  createSoftwareApplicationSchema,
  serializeJsonLd,
} from "@/lib/seo";
import { siteConfig } from "@/lib/site";

const softwareApplicationSchema = createSoftwareApplicationSchema();
const faqSchema = createFaqSchema(siteConfig.homepageFaqs);

export const metadata = createPageMetadata({
  title: siteConfig.homeTitle,
  description: siteConfig.homeDescription,
  path: siteConfig.routes.home,
});

export default function Home() {
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
      <main className="relative z-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(softwareApplicationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
        />
        <Hero />
        <Features />
        <HowItWorks />
        <Platforms />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
