export interface SiteLink {
  label: string;
  href: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  links?: readonly SiteLink[];
}

export const homepageFaqs = [
  {
    question: "Which AI tools can plenz work with?",
    answer:
      "plenz helps you refine prompts inside ChatGPT, Claude, Gemini, Mistral, OpenRouter, and custom AI chat surfaces so you can improve instructions before they reach a model.",
    links: [
      { label: "View supported AI surfaces", href: "/#platforms" },
      { label: "Open the setup guide", href: "/getting-started" },
    ],
  },
  {
    question: "How does Bring Your Own Key work?",
    answer:
      "You connect your own provider credentials to plenz, so usage is billed directly by OpenAI, Anthropic, Google Gemini, Mistral, Groq, OpenRouter, or your custom endpoint instead of through a plenz markup layer.",
    links: [
      { label: "Connect a provider", href: "/getting-started#providers" },
      {
        label: "Review supported providers",
        href: "/getting-started#api-keys",
      },
    ],
  },
  {
    question: "Is plenz private by default?",
    answer:
      "Yes. API keys and prompt text stay in your browser storage, and plenz does not rely on a relay service that sits between your prompt and the model provider you choose.",
    links: [{ label: "See the setup flow", href: "/getting-started" }],
  },
  {
    question: "Who is plenz built for?",
    answer:
      "plenz is built for founders, marketers, operators, support teams, and prompt-heavy developers who want clearer AI instructions without changing the tools they already use every day.",
    links: [{ label: "Explore core features", href: "/#features" }],
  },
  {
    question: "How quickly can I start using plenz?",
    answer:
      "Most users can install the extension, connect a provider, and start refining prompts in a few minutes. The getting-started guide walks through installation, provider setup, and API key configuration step by step.",
    links: [
      { label: "Read the getting-started guide", href: "/getting-started" },
    ],
  },
] as const satisfies readonly FaqItem[];

export const siteConfig = {
  name: "plenz",
  shortName: "plenz",
  defaultTitle: "plenz | AI Prompt Refinement in Your Browser",
  description:
    "Open-source browser extension that refines AI prompts in real time. Bring your own API key, keep prompt text local, and improve prompts before you send them.",
  homeTitle: "plenz | Rewrite AI Prompts Before You Send Them",
  homeDescription:
    "Refine AI prompts in real time inside ChatGPT, Claude, and Gemini. Bring your own API key, keep prompt text local, and improve every instruction before you send.",
  gettingStartedTitle: "Getting Started | plenz",
  gettingStartedDescription:
    "Install plenz, connect your AI provider, add an API key, and start refining prompts inside ChatGPT, Claude, Gemini, and more in just a few minutes.",
  url: "https://plenz-web.vercel.app",
  locale: "en_US",
  ogImage: "/opengraph-image.png",
  logo: "/favicon.ico",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Chrome and Chromium-based browsers",
  keywords: [
    "AI prompt refinement",
    "prompt engineering",
    "ChatGPT extension",
    "Claude extension",
    "BYOK AI",
    "open source",
  ],
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  routes: {
    home: "/",
    gettingStarted: "/getting-started",
  },
  links: {
    chromeWebStore:
      "https://chromewebstore.google.com/detail/plenz/fdbjbkomedpokmfkmacjnbdnghkejihl",
    github: "https://github.com/i-see-pixels/plenz",
    gitRepoPath: "i-see-pixels/plenz",
  },
  sameAs: ["https://github.com/i-see-pixels/plenz"],
  supportedPlatforms: [
    "ChatGPT",
    "Claude",
    "Gemini",
    "Mistral",
    "OpenRouter",
    "Custom AI surfaces",
  ],
  supportedProviders: [
    "OpenAI",
    "Anthropic",
    "Google Gemini",
    "Mistral",
    "Groq",
    "OpenRouter",
    "Custom local and self-hosted models",
  ],
  featureList: [
    "Inline prompt rewrite suggestions before you send a message",
    "Bring Your Own Key provider setup with direct billing to your chosen model vendor",
    "Local-first privacy with prompt text and API keys stored in the browser",
    "Keyboard-friendly accept and dismiss flows for fast drafting",
  ],
  privacyPromise:
    "API keys and prompt text stay in your browser storage. plenz does not route your prompt through a central relay service.",
  homepageFaqs,
} as const;
