import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PromptLens — AI Prompt Refinement, Right in Your Browser",
  description:
    "Open-source Chrome extension that refines your AI prompts in real time. Like Grammarly, but for AI. Bring your own API key. Privacy-first. Free forever.",
  keywords: [
    "AI prompt",
    "prompt engineering",
    "Chrome extension",
    "ChatGPT",
    "Claude",
    "Gemini",
    "open source",
    "prompt refinement",
  ],
  openGraph: {
    title: "PromptLens — AI Prompt Refinement, Right in Your Browser",
    description:
      "Open-source Chrome extension that refines your AI prompts in real time. Bring your own API key. Privacy-first. Free forever.",
    type: "website",
    url: "https://promptlens.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptLens — AI Prompt Refinement",
    description:
      "Open-source Chrome extension that refines your AI prompts in real time.",
  },
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
