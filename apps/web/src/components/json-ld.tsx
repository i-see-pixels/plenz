import { serializeJsonLd } from "@/lib/seo";

/** Structured data for search engines, as Next.js recommends embedding it. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has to be raw script text; serializeJsonLd escapes "<" so it can't close the tag
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
