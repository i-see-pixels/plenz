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
      "plenz runs inside ChatGPT, Claude, Gemini, and Perplexity. You can also turn it on for any other site from the popup, and it uses the text box you click into.",
    links: [
      { label: "View supported AI surfaces", href: "/#platforms" },
      { label: "Open the setup guide", href: "/getting-started" },
    ],
  },
  {
    question: "Do I need an API key?",
    answer:
      "Not always. If your Chrome supports its built-in Gemini Nano model, plenz refines prompts on your device with no key and no network call. The free prompt check that runs while you type never needs a key.",
    links: [{ label: "Open the setup guide", href: "/getting-started" }],
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
      "Yes. API keys stay in your browser storage, and plenz sends your prompt straight to the provider you choose, with no relay service in between. What plenz learns about your preferences stays on your device. If you turn on Cloud Sync, your keys are encrypted with a passphrase only you know before they leave the browser.",
    links: [{ label: "See the setup flow", href: "/getting-started" }],
  },
  {
    question: "What is the Prompt Gallery?",
    answer:
      "A side panel of trending and newly added prompts you can browse without an account. Sign in with Google to save your own prompts and insert them in the chat box by typing /.",
    links: [{ label: "Explore core features", href: "/#features" }],
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
      "Most users are refining prompts within a few minutes. A welcome page opens after you install and walks you through picking a model. The getting-started guide covers provider setup and API keys step by step.",
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
    "Open-source browser extension that checks and refines AI prompts before you send them. Use Chrome's on-device model or your own API key, and see every change before you accept it.",
  homeTitle: "plenz | Rewrite AI Prompts Before You Send Them",
  homeDescription:
    "Check and refine AI prompts inside ChatGPT, Claude, Gemini, and Perplexity. Use Chrome's on-device model or your own API key, and review every change before you send.",
  gettingStartedTitle: "Getting Started | plenz",
  gettingStartedDescription:
    "Install plenz, pick Chrome's on-device model or connect your AI provider, and start refining prompts inside ChatGPT, Claude, Gemini, and Perplexity in a few minutes.",
  url: "https://plenz.siddsingh.dev",
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
    prompts: "/prompts",
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
    "Perplexity",
    "Any site you turn plenz on for",
  ],
  supportedProviders: [
    "Chrome on-device Gemini Nano",
    "OpenAI",
    "Anthropic",
    "Google Gemini",
    "Mistral",
    "Groq",
    "OpenRouter",
    "Custom local and self-hosted models",
  ],
  featureList: [
    "Free local prompt check with a score while you type",
    "On-demand refine modes streamed as they are written: Improve, Tighten, Structure, and Ask me",
    "Word-level diff preview with per-change accept and undo",
    "Context cards and a / command to insert saved prompts",
    "Prompt Gallery side panel with trending and saved prompts",
    "Chrome's on-device Gemini Nano with no API key, or Bring Your Own Key",
    "Local-first privacy with optional end-to-end encrypted Cloud Sync",
    "Keyboard shortcuts to refine, accept, and dismiss",
  ],
  privacyPromise:
    "API keys stay in your browser storage, and Cloud Sync encrypts them with your passphrase first. plenz does not route your prompt through a central relay service.",
  homepageFaqs,
} as const;
