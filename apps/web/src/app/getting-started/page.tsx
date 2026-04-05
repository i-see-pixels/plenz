import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import {
  createBreadcrumbSchema,
  createPageMetadata,
  serializeJsonLd,
} from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { Key, Link as LinkIcon } from "lucide-react";
import anthropic from "../../assets/anthropic.png";
import chromePage from "../../assets/chrome-page.png";
import configPage from "../../assets/config.png";
import customProvider from "../../assets/custom-provider.png";
import google from "../../assets/google.png";
import groq from "../../assets/groq.png";
import mistral from "../../assets/mistral.png";
import openAI from "../../assets/openai.png";
import openrouter from "../../assets/openrouter.png";

const breadcrumbSchema = createBreadcrumbSchema([
  { name: "Home", path: siteConfig.routes.home },
  { name: "Getting Started", path: siteConfig.routes.gettingStarted },
]);

export const metadata = createPageMetadata({
  title: siteConfig.gettingStartedTitle,
  description: siteConfig.gettingStartedDescription,
  path: siteConfig.routes.gettingStarted,
});

const providers = [
  {
    name: "OpenAI",
    url: "https://platform.openai.com",
    steps: [
      "Navigate to the OpenAI Platform.",
      "Sign in to your account.",
      "Go to the Dashboard and select 'API keys'.",
      "Click 'Create new secret key'.",
      "Copy your key immediately (you won't be able to see it again).",
    ],
    image: <Image src={openAI} alt="OpenAI provider setup" />,
  },
  {
    name: "Anthropic",
    url: "https://console.anthropic.com",
    steps: [
      "Navigate to the Anthropic Console.",
      "Sign in to your account.",
      "Go to Settings and select 'API Keys'.",
      "Click 'Create Key'.",
      "Name your key and copy the generated secret.",
    ],
    image: <Image src={anthropic} alt="Anthropic provider setup" />,
  },
  {
    name: "Google Gemini",
    url: "https://aistudio.google.com",
    steps: [
      "Navigate to Google AI Studio.",
      "Sign in with your Google account.",
      "Click 'Get API key' in the sidebar.",
      "Click 'Create API key' in a new or existing project.",
      "Copy the generated API key.",
    ],
    image: <Image src={google} alt="Google Gemini provider setup" />,
  },
  {
    name: "Mistral",
    url: "https://console.mistral.ai",
    steps: [
      "Navigate to the Mistral Console.",
      "Sign in to your account.",
      "Select 'API keys' from the menu.",
      "Click 'Create new key'.",
      "Copy the generated key.",
    ],
    image: <Image src={mistral} alt="Mistral provider setup" />,
  },
  {
    name: "Groq",
    url: "https://console.groq.com",
    steps: [
      "Navigate to the Groq Cloud Console.",
      "Sign in to your account.",
      "Select 'API Keys' from the sidebar.",
      "Click 'Create API Key'.",
      "Copy your lightning-fast inference key.",
    ],
    image: <Image src={groq} alt="Groq provider setup" />,
  },
  {
    name: "OpenRouter",
    url: "https://openrouter.ai/keys",
    steps: [
      "Navigate to OpenRouter's Keys page.",
      "Sign in to your account.",
      "Click 'Create Key'.",
      "Copy the generated API key.",
    ],
    image: <Image src={openrouter} alt="OpenRouter provider setup" />,
  },
  {
    name: "Custom (Local & Self-hosted)",
    url: "#custom-endpoint",
    steps: [
      "Start your local server (e.g. LM Studio, Ollama, vLLM).",
      "Locate the host URL (e.g., http://localhost:1234/v1).",
      "In plenz Settings, select 'Custom'.",
      "Enter your host URL and optional API Key.",
      "Test the connection to ensure plenz can reach your server.",
    ],
    image: <Image src={customProvider} alt="Custom provider setup" />,
  },
];

export default function GettingStarted() {
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

      <main className="relative z-10 px-4 py-24 sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
        />

        <div className="mx-auto max-w-4xl space-y-16">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Getting Started
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Welcome to plenz. We run completely entirely in your browser
              environment, which means your prompt text never routes through a
              unified backend server and stays private by default. Let&apos;s
              get your workspace set up.
            </p>
            <div className="flex flex-wrap gap-3 font-mono text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <Link
                href="/#features"
                className="transition-colors hover:text-foreground"
              >
                Back to features
              </Link>
              <Link
                href="/#platforms"
                className="transition-colors hover:text-foreground"
              >
                Supported surfaces
              </Link>
            </div>
          </div>

          <div className="space-y-12">
            <div
              id="installation"
              className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                <span className="mono-label text-base">01</span>
              </div>
              <div className="flex-1 space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Install the Extension
                </h2>
                <p className="leading-relaxed text-muted-foreground">
                  First, download the plenz extension from the Chrome Web
                  Store. Once installed, be sure to pin it to your browser
                  toolbar for quick access. This allows you to easily hop into
                  settings or toggle extension status.
                </p>
                <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border shadow-md flex flex-col items-center justify-center text-center">
                  <Image src={chromePage} alt="plenz Chrome Web Store page" />
                </div>
              </div>
            </div>

            <div
              id="providers"
              className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                <span className="mono-label text-base">02</span>
              </div>
              <div className="flex-1 space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Select your AI Provider
                </h2>
                <p className="leading-relaxed text-muted-foreground">
                  plenz works with the major AI language models. Since we
                  use a "BYOK" (Bring Your Own Key) model, you only pay for your
                  literal inference costs directly to the provider, with zero
                  markup. Click on the plenz icon, open Settings, and
                  select a provider from the dropdown.
                </p>
                <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-muted/50 flex flex-col items-center justify-center text-center p-6">
                  <Image src={configPage} alt="plenz provider configuration" />
                </div>
              </div>
            </div>

            <div
              id="api-keys"
              className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                <span className="mono-label text-base">03</span>
              </div>
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Obtain Your API Keys
                  </h2>
                  <p className="leading-relaxed text-muted-foreground">
                    Retrieve a valid API key from your preferred provider to
                    proceed. The keys are instantly stored in
                    `chrome.storage.local` within your browser and never leave
                    your environment. Expand the sections below to find exact
                    instructions for the provider you just chose.
                  </p>
                </div>

                <div className="grid gap-6">
                  {providers.map((provider) => (
                    <div
                      key={provider.name}
                      className="flex flex-col gap-4 rounded-md border border-border bg-card p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5 text-muted-foreground" />
                          <h3 className="text-xl font-semibold">
                            {provider.name}
                          </h3>
                        </div>
                        {provider.url !== "#custom-endpoint" && (
                          <a
                            href={provider.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mono-label flex items-center gap-1 transition-colors hover:text-foreground"
                          >
                            Console <LinkIcon className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                        {provider.steps.map((step, index) => (
                          <li key={index} className="text-sm">
                            {step}
                          </li>
                        ))}
                      </ol>

                      <div className="relative mt-4 aspect-21/9 w-full overflow-hidden rounded-md bg-muted/30 shadow-md flex flex-col items-center justify-center text-center">
                        {provider.image}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

