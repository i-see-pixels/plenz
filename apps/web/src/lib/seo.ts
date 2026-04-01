import type { Metadata } from "next";
import { siteConfig, type FaqItem } from "@/lib/site";

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

const organizationId = getAbsoluteUrl("/#organization");
const websiteId = getAbsoluteUrl("/#website");
const softwareApplicationId = getAbsoluteUrl("/#software-application");

export function getAbsoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataOptions): Metadata {
  const canonical = getAbsoluteUrl(path);

  return {
    title,
    description,
    keywords: [...siteConfig.keywords],
    robots: siteConfig.robots,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function createSiteGraphSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: getAbsoluteUrl(siteConfig.logo),
        sameAs: [...siteConfig.sameAs],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "en",
        publisher: {
          "@id": organizationId,
        },
      },
    ],
  };
}

export function createSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": softwareApplicationId,
    name: siteConfig.name,
    applicationCategory: siteConfig.applicationCategory,
    operatingSystem: siteConfig.operatingSystem,
    description: siteConfig.description,
    url: siteConfig.url,
    downloadUrl: siteConfig.links.chromeWebStore,
    isAccessibleForFree: true,
    browserRequirements: siteConfig.operatingSystem,
    featureList: [...siteConfig.featureList],
    publisher: {
      "@id": organizationId,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function createFaqSchema(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function createBreadcrumbSchema(items: readonly BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getAbsoluteUrl(item.path),
    })),
  };
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
