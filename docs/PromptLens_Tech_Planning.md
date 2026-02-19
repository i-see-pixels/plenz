# Tech Planning Document — PromptLens

| Field | Details |
| --- | --- |
| **Title/Initiative** | **PromptLens** — Open-Source AI Prompt Refinement Browser Extension |
| **Date & Version** | February 7, 2026 · v1.0 |
| **Parent Document** | PromptLens PRD v1.0 (Feb 7, 2026) |
| **Tech POC** | *(To be assigned)* |
| **Status** | Draft — Pending Technical Review |

---

## 1. Technical Vision & Goals

PromptLens is a **client-side-only** browser extension that provides real-time AI prompt refinement inline on major AI chat platforms. The guiding technical philosophy is:

- **Zero backend** — All LLM communication happens directly between the user's browser and their chosen provider endpoint. No PromptLens server ever touches prompt data or API keys.
- **Privacy by architecture** — Security is enforced structurally (local-only storage, direct API calls), not by policy alone.
- **Contributor-first DX** — TypeScript, modular plugin architecture, clear interfaces, and comprehensive docs make it easy for open-source contributors to extend the tool.
- **Performance-obsessed** — The extension must be invisible to the user's browsing experience: < 100 ms added page load, < 1 s suggestion latency after typing pause.

### Technical Success Criteria

| Metric | Target | Measurement |
| --- | --- | --- |
| Page load overhead | < 100 ms | Lighthouse CI on supported platforms |
| Suggestion latency (end-to-end) | < 1,000 ms (after debounce) | Performance.now() instrumentation |
| Extension bundle size | < 500 KB (gzipped) | Build pipeline check |
| Memory footprint | < 30 MB per tab | Chrome Task Manager profiling |
| Crash-free sessions | > 99.5% | Error tracking (Sentry self-hosted) |
| Cross-browser parity | Chrome + Firefox feature parity | E2E test suite |

---

## 2. Architecture Overview

### High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                            │
│                                                                  │
│  ┌─────────────┐    ┌──────────────────┐    ┌────────────────┐  │
│  │  Extension   │    │  Content Script   │    │   Options /    │  │
│  │  Popup UI    │◄──►│  (per AI tab)     │◄──►│   Settings     │  │
│  │             │    │                  │    │   Page         │  │
│  └──────┬──────┘    └────────┬─────────┘    └───────┬────────┘  │
│         │                    │                      │            │
│         └────────────┬───────┴──────────────────────┘            │
│                      │                                           │
│              ┌───────▼────────┐                                  │
│              │  Background     │                                  │
│              │  Service Worker │                                  │
│              │                 │                                  │
│              │  • Message Bus  │                                  │
│              │  • Auth Manager │                                  │
│              │  • Storage Mgr  │                                  │
│              │  • Provider Rtr │                                  │
│              └───────┬────────┘                                  │
│                      │                                           │
│         ┌────────────┼────────────────┐                          │
│         │            │                │                          │
│   ┌─────▼─────┐ ┌───▼─────┐  ┌──────▼──────┐                   │
│   │ Provider  │ │ Provider│  │  Provider   │                   │
│   │ Adapter:  │ │ Adapter:│  │  Adapter:   │                   │
│   │ OpenAI    │ │ Anthropic│  │  Custom     │   ... (7 total)  │
│   └─────┬─────┘ └───┬─────┘  └──────┬──────┘                   │
│         │            │               │                          │
└─────────┼────────────┼───────────────┼──────────────────────────┘
          │            │               │
          ▼            ▼               ▼
   ┌────────────┐ ┌──────────┐  ┌──────────────┐
   │ OpenAI API │ │Anthropic │  │ User's Own   │
   │            │ │  API     │  │ Endpoint     │
   └────────────┘ └──────────┘  └──────────────┘
```

### Component Responsibilities

| Component | Responsibility | Runs In |
| --- | --- | --- |
| **Background Service Worker** | Message routing, auth orchestration, storage management, provider dispatch | Extension background (MV3 service worker) |
| **Content Script** | DOM detection, input field hooking, suggestion UI rendering (Shadow DOM), keyboard event handling | Injected into AI platform pages |
| **Popup UI** | Sign-in status, active model quick-toggle, suggestion stats, quick settings | Extension popup (click on toolbar icon) |
| **Options Page** | Full model configuration, API key management, preference settings, analytics opt-in | Dedicated extension page |
| **Provider Adapters** | Normalize API calls to each LLM provider; implement the standard `ProviderAdapter` interface | Called by service worker |
| **Core Engine** | Prompt quality rubric, system prompt construction, suggestion parsing and ranking | Shared module used by service worker |

---

## 3. Tech Stack

### Core Stack

| Layer | Technology | Rationale |
| --- | --- | --- |
| Language | **TypeScript 5.x** | Type safety, superior DX, auto-complete for contributors |
| Build Tool | **Vite + CRXJS** | Fast HMR during dev, native MV3 support, tree-shaking |
| UI Framework | **Preact** (popup + options) | 3 KB gzipped — React-compatible API without the bundle weight |
| Content Script UI | **Vanilla TS + Shadow DOM** | Zero framework overhead in content scripts; Shadow DOM isolates styles |
| Styling | **Tailwind CSS** (popup/options) + **CSS Modules** (content script) | Utility-first for rapid UI; CSS Modules prevent host page conflicts |
| State Management | **Zustand** | Minimal, TypeScript-native, no boilerplate |
| Testing | **Vitest** (unit) + **Playwright** (E2E) | Fast unit tests; Playwright supports extension testing in Chromium/Firefox |
| Linting/Formatting | **Biome** | Single tool replacing ESLint + Prettier; fast, zero-config |
| CI/CD | **GitHub Actions** | Community standard for OSS; free for public repos |
| Analytics (opt-in) | **Umami** (self-hosted) | Privacy-respecting, lightweight, GDPR-compliant, self-hostable |
| Error Tracking | **Sentry** (self-hosted or free tier) | Stack traces + breadcrumbs for crash diagnostics |

### Browser APIs Used

| API | Purpose | Chrome | Firefox |
| --- | --- | --- | --- |
| `chrome.identity` | Google OAuth 2.0 sign-in | ✅ Native | `browser.identity.launchWebAuthFlow()` |
| `chrome.storage.local` | API keys, preferences, suggestion history | ✅ | ✅ (via `browser.storage.local`) |
| `chrome.storage.sync` | Non-sensitive preferences cross-device sync | ✅ | ✅ |
| `chrome.scripting` | Dynamic content script injection | ✅ MV3 | MV2 `content_scripts` in manifest |
| `chrome.contextMenus` | Right-click "Enhance with PromptLens" fallback | ✅ | ✅ |
| `chrome.alarms` | Periodic cleanup of stale suggestion cache | ✅ | ✅ |

---

## 4. Detailed Component Design

### 4.1 Content Script — Platform Detection Layer

The content script is the heart of PromptLens. It must reliably detect and hook into AI chat input fields across multiple platforms that frequently change their DOM structure.

#### Platform Selector Registry

```typescript
// src/content/platforms/registry.ts

interface PlatformConfig {
  name: string;
  hostPatterns: string[];           // URL match patterns
  inputSelectors: string[];         // CSS selectors for chat input (ordered by priority)
  submitButtonSelectors: string[];  // For intercepting submission
  containerSelector: string;        // Parent container for positioning overlay
  inputType: 'contenteditable' | 'textarea' | 'prosemirror';
  mutationTarget?: string;          // Selector to observe for SPA navigation
}

const PLATFORM_REGISTRY: PlatformConfig[] = [
  {
    name: 'chatgpt',
    hostPatterns: ['*://chatgpt.com/*', '*://chat.openai.com/*'],
    inputSelectors: ['#prompt-textarea', '[data-id="root"] textarea'],
    submitButtonSelectors: ['[data-testid="send-button"]'],
    containerSelector: 'form',
    inputType: 'contenteditable',
    mutationTarget: '#__next',
  },
  {
    name: 'claude',
    hostPatterns: ['*://claude.ai/*'],
    inputSelectors: ['[contenteditable="true"].ProseMirror', 'fieldset .ProseMirror'],
    submitButtonSelectors: ['button[aria-label="Send Message"]'],
    containerSelector: 'fieldset',
    inputType: 'prosemirror',
    mutationTarget: '#__next',
  },
  {
    name: 'gemini',
    hostPatterns: ['*://gemini.google.com/*'],
    inputSelectors: ['rich-textarea .ql-editor', '.text-input-field textarea'],
    submitButtonSelectors: ['button.send-button', '[aria-label="Send message"]'],
    containerSelector: '.input-area',
    inputType: 'contenteditable',
  },
  {
    name: 'perplexity',
    hostPatterns: ['*://www.perplexity.ai/*'],
    inputSelectors: ['textarea[placeholder*="Ask"]', 'textarea.overflow-auto'],
    submitButtonSelectors: ['button[aria-label="Submit"]'],
    containerSelector: 'form',
    inputType: 'textarea',
  },
  // Additional platforms: Copilot, DeepSeek, Grok, etc.
];
```

#### Resilience Strategy

AI platforms frequently update their DOM. The detection layer must be resilient:

1. **Multi-selector fallback** — Each platform has an ordered list of selectors; the first match wins.
2. **MutationObserver** — Observes the SPA root for route changes and re-runs detection.
3. **Generic fallback** — If no platform-specific selector matches, fall back to a heuristic: any `<textarea>` or `contenteditable` element on a known AI domain.
4. **Self-healing via community** — Broken selectors trigger a `selector_miss` event (opt-in analytics) so the community can quickly submit fixes.
5. **User-reported breakage** — A "Report broken page" button in the popup opens a pre-filled GitHub Issue template.

### 4.2 Content Script — Suggestion UI (Shadow DOM)

```typescript
// src/content/ui/SuggestionOverlay.ts

class SuggestionOverlay {
  private shadowHost: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private container: HTMLDivElement;

  constructor(anchorElement: HTMLElement) {
    this.shadowHost = document.createElement('div');
    this.shadowHost.id = 'promptlens-overlay';
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'closed' });

    // Inject isolated styles
    const styles = document.createElement('style');
    styles.textContent = OVERLAY_STYLES; // Compiled CSS module
    this.shadowRoot.appendChild(styles);

    this.container = document.createElement('div');
    this.container.className = 'pl-suggestion-container';
    this.shadowRoot.appendChild(this.container);

    // Position relative to the input field
    anchorElement.parentElement?.appendChild(this.shadowHost);
  }

  show(suggestions: Suggestion[]): void { /* render suggestion cards */ }
  hide(): void { /* animate out and remove */ }
  acceptTop(): void { /* apply first suggestion to input */ }
  navigateSuggestions(direction: 'up' | 'down'): void { /* keyboard nav */ }
  destroy(): void { this.shadowHost.remove(); }
}
```

**Why Shadow DOM?** Competitors like Prompt Perfect and Promptimize have documented issues with CSS conflicts when Grammarly or similar overlay extensions are active. Shadow DOM completely isolates PromptLens styles, preventing z-index battles and style leakage.

### 4.3 Background Service Worker

```typescript
// src/background/index.ts

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'ANALYZE_PROMPT':
      handleAnalyzePrompt(message.payload, sender.tab?.id)
        .then(sendResponse);
      return true; // async response

    case 'GET_ACTIVE_MODEL':
      getActiveModelConfig().then(sendResponse);
      return true;

    case 'TEST_CONNECTION':
      testProviderConnection(message.payload).then(sendResponse);
      return true;

    case 'AUTH_SIGN_IN':
      handleGoogleSignIn().then(sendResponse);
      return true;
  }
});
```

#### Message Protocol

| Message Type | Direction | Payload | Response |
| --- | --- | --- | --- |
| `ANALYZE_PROMPT` | Content → BG | `{ prompt: string, platform: string }` | `{ suggestions: Suggestion[], latency_ms: number }` |
| `GET_ACTIVE_MODEL` | Popup/Content → BG | `{}` | `{ provider: string, model: string, isConfigured: boolean }` |
| `SWITCH_MODEL` | Popup → BG | `{ configId: string }` | `{ success: boolean }` |
| `TEST_CONNECTION` | Options → BG | `{ provider: string, apiKey: string, model: string }` | `{ success: boolean, latency_ms: number, error?: string }` |
| `AUTH_SIGN_IN` | Popup → BG | `{}` | `{ user: { name, email, avatar } }` |
| `LOG_EVENT` | Content/Popup → BG | `{ event: string, properties: Record }` | `{ ack: boolean }` |

### 4.4 Provider Adapter System

Every LLM provider implements a standard interface. This is the primary extension point for open-source contributors.

```typescript
// src/providers/types.ts

interface ProviderAdapter {
  /** Unique provider ID (e.g., 'openai', 'anthropic') */
  id: string;

  /** Human-readable name */
  name: string;

  /** Available models for this provider */
  models: ModelOption[];

  /** Validate that the API key and model work */
  testConnection(config: ProviderConfig): Promise<ConnectionTestResult>;

  /** Send the prompt + system prompt to the LLM and return suggestions */
  analyze(prompt: string, systemPrompt: string, config: ProviderConfig): Promise<AnalysisResult>;
}

interface ProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;        // For custom/self-hosted providers
  maxTokens?: number;      // Default: 1024
  temperature?: number;    // Default: 0.3 (low creativity for analysis)
}

interface AnalysisResult {
  suggestions: Suggestion[];
  rawResponse: string;
  tokensUsed: { prompt: number; completion: number };
  latencyMs: number;
}

interface Suggestion {
  id: string;
  type: 'rewrite' | 'add_context' | 'add_constraints' | 'add_role' | 'add_format' | 'clarify';
  original: string;
  suggested: string;
  rationale: string;       // One-line explanation (shown to user)
  confidence: number;      // 0-1 score
  position?: { start: number; end: number }; // Character range in original prompt
}
```

#### OpenAI Adapter (Reference Implementation)

```typescript
// src/providers/openai.ts

export class OpenAIAdapter implements ProviderAdapter {
  id = 'openai';
  name = 'OpenAI';
  models = [
    { id: 'gpt-4o', name: 'GPT-4o', tier: 'premium' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'standard' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', tier: 'budget' },
  ];

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    const start = performance.now();
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });
      const latency = Math.round(performance.now() - start);
      if (!res.ok) {
        const err = await res.json();
        return { success: false, latencyMs: latency, error: err.error?.message };
      }
      return { success: true, latencyMs: latency };
    } catch (e) {
      return { success: false, latencyMs: 0, error: (e as Error).message };
    }
  }

  async analyze(prompt: string, systemPrompt: string, config: ProviderConfig): Promise<AnalysisResult> {
    const start = performance.now();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.maxTokens ?? 1024,
        temperature: config.temperature ?? 0.3,
        response_format: { type: 'json_object' },
      }),
    });
    const data = await res.json();
    const latency = Math.round(performance.now() - start);
    return parseAnalysisResponse(data, latency);
  }
}
```

#### Adding a New Provider (Contributor Guide)

Contributors add a new provider in 3 steps:

1. Create `src/providers/<provider_name>.ts` implementing `ProviderAdapter`.
2. Register the adapter in `src/providers/index.ts` (add to the exported array).
3. Add a test file `tests/providers/<provider_name>.test.ts` with mock API responses.

No other files need to be modified — the options page dynamically reads the provider registry.

### 4.5 Core Engine — Prompt Analysis & Rubric

The analysis engine constructs a system prompt that instructs the user's chosen LLM to evaluate the input prompt against a quality rubric and return structured suggestions.

#### Prompt Quality Rubric

| Dimension | Weight | Check |
| --- | --- | --- |
| **Specificity** | 25% | Does the prompt specify the subject, scope, and detail level? |
| **Role / Persona** | 15% | Does it assign a role to the AI (e.g., "Act as a senior developer")? |
| **Constraints** | 20% | Are there word limits, tone, audience, or content restrictions? |
| **Output Format** | 15% | Does it specify the desired format (list, table, code, email, etc.)? |
| **Context** | 15% | Does it provide necessary background information? |
| **Tone & Style** | 10% | Does it indicate the desired communication style? |

#### System Prompt Template

```
You are PromptLens, a prompt-quality analysis engine. Evaluate the user's draft
prompt against this rubric and return a JSON object with improvement suggestions.

RUBRIC:
1. Specificity (25%): Is the subject, scope, and desired detail level clear?
2. Role (15%): Should the AI adopt a specific persona or expertise?
3. Constraints (20%): Are there bounds on length, tone, audience, or content?
4. Format (15%): Is the expected output format specified?
5. Context (15%): Is sufficient background provided?
6. Tone (10%): Is the communication style indicated?

RULES:
- Return 1-5 suggestions, ranked by impact.
- Each suggestion must include: type, original_text, suggested_text, rationale (1 sentence), confidence (0-1).
- If the prompt is already high-quality (scores > 0.8 on all dimensions), return an empty suggestions array.
- Preserve the user's intent — never change the core meaning.
- Keep suggested_text concise — don't bloat the prompt unnecessarily.
- Respond ONLY with valid JSON matching this schema:

{
  "score": { "overall": 0.0-1.0, "specificity": 0.0-1.0, "role": 0.0-1.0, ... },
  "suggestions": [
    {
      "type": "add_role" | "add_constraints" | "add_format" | "clarify" | "rewrite" | "add_context",
      "original_text": "...",
      "suggested_text": "...",
      "rationale": "...",
      "confidence": 0.0-1.0
    }
  ]
}
```

#### Debounce & Throttling Strategy

```
User types → [500ms debounce] → Extract prompt text
  → [Check: prompt length > 5 chars AND changed since last analysis]
  → [Check: not currently awaiting a response]
  → Send to background service worker
  → Provider adapter calls user's LLM
  → Parse JSON response → Rank suggestions
  → Send back to content script → Render overlay
```

- **Debounce:** 500 ms after last keystroke (configurable in settings: 300–1000 ms).
- **Throttle:** Maximum 1 request per 3 seconds to avoid burning the user's API quota.
- **Abort:** If the user starts typing again during analysis, abort the in-flight request via `AbortController`.
- **Cache:** Cache the last 10 analyses (keyed by prompt hash) in memory to avoid re-analyzing identical prompts.

---

## 5. Data & Security Architecture

### 5.1 Data Classification

| Data Type | Storage Location | Synced? | Encrypted? | Leaves Browser? |
| --- | --- | --- | --- | --- |
| API keys | `chrome.storage.local` | ❌ Never | ✅ At rest (browser-managed) | ❌ Only to user's chosen LLM endpoint |
| User preferences (theme, debounce, etc.) | `chrome.storage.sync` | ✅ Via Google account | ✅ In transit (Chrome Sync) | ✅ To Chrome Sync only |
| Suggestion history | `chrome.storage.local` | Optional (opt-in sync) | ✅ At rest | ❌ (or to Sync if opted in) |
| Prompt text | In-memory only | ❌ Never | N/A | ❌ Only to user's chosen LLM endpoint |
| Auth tokens (Google OAuth) | `chrome.storage.local` | ❌ | ✅ At rest | ❌ Only to Google OAuth endpoints |
| Analytics events | Local → Umami (opt-in) | N/A | ✅ In transit | ✅ Only if user opts in |

### 5.2 API Key Security

1. **Storage**: Keys are stored in `chrome.storage.local`, which is sandboxed per-extension and encrypted at rest by the browser.
2. **Display**: Keys are always masked in the UI (`••••••••sk-xyz`). A "reveal" toggle shows the key only while held.
3. **Transmission**: Keys are sent **only** in the `Authorization` header of direct HTTPS requests to the user's chosen provider. They are **never** included in requests to any PromptLens-owned domain.
4. **Content Security Policy**: The extension's CSP restricts `connect-src` to the whitelisted provider API domains + the user's custom base URL.
5. **No logging**: API keys are excluded from all error tracking and analytics payloads. Sentry is configured with a `beforeSend` hook that strips any string matching API key patterns.

### 5.3 Content Security Policy (manifest.json)

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.mistral.ai https://api.groq.com https://openrouter.ai https://*.umami.is"
  }
}
```

For custom provider URLs, the extension dynamically requests `host_permissions` via `chrome.permissions.request()` at runtime (user must explicitly approve).

---

## 6. Build, CI/CD & Release Pipeline

### 6.1 Repository Structure (Expanded)

```
promptlens/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Lint + type-check + unit tests on every PR
│   │   ├── e2e.yml             # Playwright E2E on merge to main
│   │   ├── release-chrome.yml  # Build + publish to Chrome Web Store
│   │   └── release-firefox.yml # Build + publish to Firefox Add-ons
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── broken_platform.md  # "Platform X stopped working"
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── manifest.json               # Chrome MV3 manifest
├── manifest.firefox.json       # Firefox-specific overrides (merged at build time)
├── src/
│   ├── background/
│   │   ├── index.ts            # Service worker entry
│   │   ├── auth.ts             # Google OAuth manager
│   │   ├── storage.ts          # Storage abstraction (local + sync)
│   │   └── router.ts           # Message router
│   ├── content/
│   │   ├── index.ts            # Content script entry
│   │   ├── detector.ts         # Platform detection + input hooking
│   │   ├── analyzer.ts         # Debounce, throttle, request lifecycle
│   │   ├── ui/
│   │   │   ├── SuggestionOverlay.ts
│   │   │   ├── BadgeIndicator.ts
│   │   │   └── styles.module.css
│   │   └── platforms/
│   │       ├── registry.ts     # Platform config registry
│   │       ├── chatgpt.ts      # ChatGPT-specific overrides
│   │       ├── claude.ts
│   │       ├── gemini.ts
│   │       └── perplexity.ts
│   ├── popup/
│   │   ├── index.html
│   │   ├── App.tsx             # Preact popup app
│   │   ├── components/
│   │   └── stores/
│   ├── options/
│   │   ├── index.html
│   │   ├── App.tsx             # Preact options app
│   │   ├── components/
│   │   │   ├── ModelConfig.tsx
│   │   │   ├── ProviderDropdown.tsx
│   │   │   ├── ApiKeyInput.tsx
│   │   │   └── ConnectionTest.tsx
│   │   └── stores/
│   ├── providers/
│   │   ├── types.ts            # ProviderAdapter interface
│   │   ├── index.ts            # Registry: exports all adapters
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── google.ts
│   │   ├── mistral.ts
│   │   ├── groq.ts
│   │   ├── openrouter.ts
│   │   └── custom.ts
│   ├── core/
│   │   ├── rubric.ts           # Prompt quality rubric definition
│   │   ├── systemPrompt.ts     # System prompt template builder
│   │   ├── suggestionParser.ts # Parse LLM JSON → Suggestion[]
│   │   └── cache.ts            # In-memory LRU cache for analyses
│   └── utils/
│       ├── crypto.ts           # Key masking, hash generation
│       ├── dom.ts              # DOM traversal helpers
│       ├── logger.ts           # Structured logging (dev mode only)
│       ├── errors.ts           # Error types + Sentry integration
│       └── analytics.ts        # Opt-in event tracking (Umami)
├── tests/
│   ├── unit/
│   │   ├── providers/          # Mock API response tests per provider
│   │   ├── core/               # Rubric + parser tests
│   │   └── content/            # Platform detection tests
│   └── e2e/
│       ├── fixtures/           # HTML fixtures mimicking AI platform DOMs
│       ├── chatgpt.spec.ts
│       ├── claude.spec.ts
│       └── onboarding.spec.ts
├── docs/
│   ├── CONTRIBUTING.md
│   ├── ARCHITECTURE.md
│   ├── ADDING_A_PROVIDER.md
│   ├── ADDING_A_PLATFORM.md
│   └── SECURITY.md
├── scripts/
│   ├── build-chrome.ts
│   ├── build-firefox.ts
│   └── update-selectors.ts    # Helper to update platform selectors
├── vite.config.ts
├── tsconfig.json
├── biome.json
├── LICENSE                     # MIT
└── README.md
```

### 6.2 CI/CD Pipeline

```
PR Opened / Updated
  │
  ├─► [ci.yml] Lint (Biome) → Type Check (tsc) → Unit Tests (Vitest)
  │     └─► ❌ Fail → Block merge
  │     └─► ✅ Pass → Approve
  │
  ├─► [e2e.yml] (on merge to main)
  │     Build Chrome extension → Launch Chromium with extension loaded
  │     → Run Playwright E2E against local HTML fixtures
  │     └─► ❌ Fail → Alert on Discord / GitHub Issue
  │     └─► ✅ Pass → Proceed
  │
  └─► [release-chrome.yml] (on Git tag v*)
        Build prod bundle → Run full test suite → Size check (< 500 KB)
        → Upload to Chrome Web Store via API → Create GitHub Release
        → [release-firefox.yml] Build Firefox variant → Submit to AMO
```

### 6.3 Build Configuration

```typescript
// vite.config.ts (simplified)
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import preact from '@preact/preset-vite';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [preact(), crx({ manifest })],
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: { manualChunks: { providers: ['./src/providers/index.ts'] } },
    },
  },
});
```

---

## 7. Testing Strategy

### 7.1 Test Pyramid

| Level | Tool | Coverage Target | What's Tested |
| --- | --- | --- | --- |
| **Unit** | Vitest | > 80% line coverage | Provider adapters (mocked HTTP), suggestion parser, rubric scoring, cache logic, crypto utils |
| **Integration** | Vitest + jsdom | Key flows | Message passing (BG ↔ Content), storage read/write, auth token lifecycle |
| **E2E** | Playwright | Core user journeys | Onboarding flow, model config, suggestion display/accept/dismiss on fixture pages |
| **Visual Regression** | Playwright screenshots | Overlay UI | Suggestion overlay positioning and styling across platforms |
| **Performance** | Lighthouse CI + custom | Budget compliance | Page load overhead < 100 ms, bundle size < 500 KB |

### 7.2 Platform DOM Fixtures

Since E2E testing against live AI platforms (ChatGPT, Claude, etc.) is fragile and may violate ToS, we use **snapshot HTML fixtures**:

1. Manually capture the DOM of each platform's chat input area.
2. Save as static HTML files in `tests/e2e/fixtures/`.
3. Playwright loads these fixtures + the extension, then verifies detection and overlay behavior.
4. Fixtures are version-tagged (e.g., `chatgpt-2026-02.html`) and updated monthly or when breakage is reported.

### 7.3 Mock Provider for Testing

```typescript
// tests/mocks/mockProvider.ts
export class MockProviderAdapter implements ProviderAdapter {
  id = 'mock';
  name = 'Mock Provider';
  models = [{ id: 'mock-1', name: 'Mock Model', tier: 'standard' }];

  async testConnection(): Promise<ConnectionTestResult> {
    return { success: true, latencyMs: 50 };
  }

  async analyze(prompt: string): Promise<AnalysisResult> {
    return {
      suggestions: [
        {
          id: 'mock-1',
          type: 'add_role',
          original: prompt,
          suggested: `As an expert, ${prompt}`,
          rationale: 'Adding a role improves output relevance.',
          confidence: 0.85,
        },
      ],
      rawResponse: '{}',
      tokensUsed: { prompt: 50, completion: 100 },
      latencyMs: 100,
    };
  }
}
```

---

## 8. Performance Budget & Optimization

### 8.1 Performance Budgets

| Metric | Budget | Enforcement |
| --- | --- | --- |
| Content script bundle | < 50 KB gzipped | CI size check |
| Total extension bundle | < 500 KB gzipped | CI size check |
| Page load impact | < 100 ms | Lighthouse CI |
| Content script init time | < 50 ms | `performance.mark()` in code |
| Suggestion render time | < 16 ms (one frame) | `requestAnimationFrame` measurement |
| Memory per tab | < 30 MB | Chrome Task Manager manual check (beta) |

### 8.2 Optimization Techniques

- **Lazy provider loading**: Provider adapters are dynamically imported only when the user configures that provider, keeping the content script lean.
- **Debounce + abort**: No wasted API calls; in-flight requests are aborted when the user resumes typing.
- **LRU suggestion cache**: The last 10 analyses are cached in memory (keyed by SHA-256 hash of the prompt text) to instantly re-display suggestions for unchanged prompts.
- **Shadow DOM isolation**: The overlay is rendered in a Shadow DOM, so PromptLens CSS never triggers repaints on the host page.
- **Minimal content script**: Only the detection + overlay code runs in the content script. All heavy logic (provider calls, parsing) runs in the service worker.
- **Tree-shaking**: Vite's tree-shaking ensures unused provider code isn't included in the content script bundle.

---

## 9. Competitive Technical Differentiation

Insights from competitive analysis inform several technical decisions:

| Competitor Weakness | PromptLens Technical Response |
| --- | --- |
| **Prompt Perfect / Promptimize** proxy prompts through their own servers | All API calls go directly from browser → user's LLM; CSP enforces this |
| **AIPRM** is template-only; no real-time analysis | Real-time analysis engine with debounced LLM calls evaluates each prompt dynamically |
| **Better Prompt** supports BYOK but is closed-source | Open-source MIT license; plugin adapter pattern invites community extensions |
| **Superpower ChatGPT** is ChatGPT-only | Platform registry pattern supports any AI site; community can add new platforms via simple config |
| **Multiple competitors** have CSS/z-index conflicts with Grammarly | Shadow DOM encapsulation completely isolates PromptLens UI |
| **TypingMind** requires a separate app (not inline) | Content script injects directly into the user's existing AI platform workflow |
| **Most competitors** offer no rationale for suggestions | Every suggestion includes a `rationale` field explaining *why* the improvement matters |

---

## 10. Development Phases & Sprint Plan

### Phase 1: Foundation (Apr 6 – Apr 24, 2026) — 3 Sprints

| Sprint | Focus | Deliverables |
| --- | --- | --- |
| S1 (Apr 6-11) | Project scaffolding | Repo setup, Vite + CRXJS config, manifest files, Biome config, CI pipeline (lint + type-check) |
| S2 (Apr 13-18) | Auth + Storage | Google OAuth flow (Chrome + Firefox), `chrome.storage.local` abstraction, encrypted key storage, options page skeleton |
| S3 (Apr 20-24) | Provider system | `ProviderAdapter` interface, OpenAI adapter (reference), mock provider, connection test flow, unit tests |

### Phase 2: Core Engine (Apr 27 – May 15, 2026) — 3 Sprints

| Sprint | Focus | Deliverables |
| --- | --- | --- |
| S4 (Apr 27-May 1) | Platform detection | Content script, platform registry (ChatGPT + Claude), MutationObserver, input field hooking |
| S5 (May 4-8) | Analysis engine | System prompt template, debounce/throttle logic, suggestion parser, LRU cache, background message handling |
| S6 (May 11-15) | Suggestion UI | Shadow DOM overlay, ghost text rendering, keyboard shortcuts (Tab/Esc/↑↓), badge indicator, animations |

### Phase 3: Alpha (May 18 – Jun 12, 2026) — 4 Sprints

| Sprint | Focus | Deliverables |
| --- | --- | --- |
| S7 (May 18-22) | Remaining providers | Anthropic, Google, Mistral, Groq, OpenRouter adapters + tests |
| S8 (May 25-29) | Remaining platforms | Gemini, Perplexity, Copilot platform configs + detection + E2E fixtures |
| S9 (Jun 1-5) | Edge cases | Error handling (invalid keys, rate limits, offline), context menu fallback, non-English detection, conflicting extensions |
| S10 (Jun 8-12) | Polish + Alpha testing | Performance optimization, bundle size audit, Lighthouse CI, internal dogfooding, bug fixes |

### Phase 4: Beta & Launch (Jun 15 – Jul 20, 2026)

| Milestone | Date | Deliverables |
| --- | --- | --- |
| Beta launch | Jun 15 | Chrome Web Store listing, public GitHub repo, README, CONTRIBUTING.md, community Discord |
| Firefox release | Jul 6 | Firefox Add-ons listing, MV2 compat layer tested |
| v1.0 launch | Jul 20 | Bug fixes from beta, performance tuning, landing page, launch announcement |

---

## 11. Risk Register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| AI platforms change DOM structure frequently | High | High | Multi-selector fallback, MutationObserver, community-reported breakage pipeline, monthly fixture updates |
| Chrome Web Store rejects extension (permissions) | Medium | High | Pre-review with Chrome team; minimize permissions; justify `activeTab` and `identity` in listing |
| LLM response latency exceeds 1s budget | Medium | Medium | Recommend fast models (GPT-4o-mini, Haiku); show "thinking" indicator; cache repeated prompts |
| API key leakage via extension vulnerability | Low | Critical | CSP restrictions, no remote code execution, Sentry key-stripping, security audit before beta |
| Low contributor adoption | Medium | Medium | Clear CONTRIBUTING.md, "good first issue" labels, modular architecture, fast CI feedback |
| Grammarly or similar extension conflicts | Medium | Low | Shadow DOM isolation (fully mitigates CSS conflicts); documented co-existence |
| Users confused by BYOK requirement | Medium | Medium | Onboarding wizard with step-by-step API key tutorial; link to free-tier provider sign-up pages |
| Firefox MV2/MV3 compat issues | Medium | Medium | Separate Firefox manifest with overrides; dedicated E2E test suite for Firefox |

---

## 12. Infrastructure & DevOps

### 12.1 Required Infrastructure

| Service | Purpose | Cost |
| --- | --- | --- |
| **GitHub** (public repo) | Source control, CI/CD, Issues, PRs | Free (public OSS) |
| **Chrome Web Store** developer account | Extension distribution | $5 one-time |
| **Firefox Add-ons** developer account | Extension distribution | Free |
| **Umami Cloud** (or self-hosted) | Privacy-respecting analytics (opt-in) | Free tier / $9/mo |
| **Sentry** (free tier or self-hosted) | Error tracking | Free tier (5K events/mo) |
| **Firebase / Supabase** (free tier) | Optional: cross-device preference sync | Free tier |
| **Cloudflare Pages** | Landing page hosting | Free |

### 12.2 Secrets Management

- Chrome Web Store API credentials → GitHub Secrets (for CI deployment).
- Firefox AMO API credentials → GitHub Secrets.
- Sentry DSN → hardcoded in extension (non-sensitive; only receives error reports).
- **No PromptLens-owned API keys exist** — all LLM calls use the user's own key.

---

## 13. Open Technical Questions

| # | Question | Options | Decision Deadline |
| --- | --- | --- | --- |
| 1 | Analytics tool: Umami vs Plausible vs PostHog self-hosted? | Umami (lighter, self-hostable); Plausible (hosted, GDPR); PostHog (feature-rich but heavy) | Before Alpha (May 18) |
| 2 | Should the analysis system prompt be user-customizable? | Yes (advanced mode) vs. No (keep it simple for v1) | Before Beta (Jun 15) |
| 3 | Support local/on-device models (WebLLM, Ollama)? | Add as a provider adapter; requires localhost `connect-src` permission | Post-v1.0 (backlog) |
| 4 | Sync server: Firebase vs Supabase vs none? | Firebase (familiar, free tier); Supabase (OSS-aligned); None (defer to post-launch) | Before Beta (Jun 15) |
| 5 | Should we support Safari via WebExtension API? | Safari support is limited but growing; requires Apple Developer account ($99/yr) | Post-v1.0 (backlog) |
| 6 | How to handle ProseMirror editors (Claude, Notion)? | Custom input adapter per editor type; ProseMirror transaction API for text injection | During Phase 2 (S4) |

---

## 14. Glossary

| Term | Definition |
| --- | --- |
| **BYOK** | Bring Your Own Key — users supply their own LLM API key |
| **MV3** | Manifest V3 — Chrome's current extension platform standard |
| **Shadow DOM** | Browser API for encapsulating DOM + styles in an isolated subtree |
| **Content Script** | JavaScript injected into web pages by a browser extension |
| **Service Worker** | Background script in MV3 that handles events without a persistent page |
| **CSP** | Content Security Policy — HTTP header / manifest directive controlling allowed resource origins |
| **Context Rot** | Degradation of LLM output quality as conversation context grows with noise |
| **Provider Adapter** | A plugin module that normalizes API calls to a specific LLM provider |

---

## Related Documents

1. **PromptLens PRD v1.0** — Product requirements and user stories
2. Design Planning Document *(to be created)*
3. Go-to-Market / Community Launch Plan *(to be created)*
4. Security Audit Checklist *(to be created before beta)*
5. CONTRIBUTING.md *(to be created during Phase 1)*

---

*Document Version: 1.0 · Date: February 7, 2026 · Status: Draft*
