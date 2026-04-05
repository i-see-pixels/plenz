# Product Requirements Document [PRD] — plenz

| Field | Details |
| --- | --- |
| **Title/Initiative** | **plenz** — Open-Source AI Prompt Refinement Browser Extension |
| **Date & Version** | February 7, 2026 · v1.0 |
| **Product - POC** | *(To be assigned)* |
| **Design POC** | *(To be assigned)* |
| **Tech POC** | *(To be assigned)* |
| **Marketing POC** | *(To be assigned)* |

---

## Why? (Objective)

### For Business
- Build an **open-source, community-driven** prompt-quality tool that becomes the de-facto standard for prompt refinement — similar to how Grammarly operates inline, but for AI prompts.
- Drive adoption through zero-paywall access; monetization is not a goal. Community contributions, GitHub stars, and ecosystem influence serve as the primary growth levers.

### For Users
- Eliminate **under-prompting** — the #1 cause of vague, unhelpful AI responses. Under-prompting leads directly to **context rot**, where bloated back-and-forth conversations degrade LLM accuracy as the context window fills with noise.
- Give every user — regardless of prompting skill — the ability to get expert-level AI outputs on the first try, saving time and reducing frustration.
- Let users **bring their own model and API key** so they retain full control over cost, privacy, and model preference — no vendor lock-in, no subscription required.

---

## How Do We Measure Success?

### Associated OKR / Goal
- **O:** Make AI interactions more productive for everyday users through an open, free tool.
- **KR1:** 50,000 active installs within 6 months of launch.
- **KR2:** 40% of users accept at least one prompt suggestion per session.
- **KR3:** Users who adopt suggestions report ≥ 30% fewer follow-up clarification messages in AI chats.
- **KR4:** 500+ GitHub stars and 50+ community contributors within 6 months.

### Success Metrics
- **Suggestion acceptance rate** (target ≥ 40%).
- **Prompt quality score delta** — average improvement in prompt specificity, measured by token count, presence of constraints, and role/context framing.
- **Weekly active users (WAU)** and **Day-7 retention**.
- **Community health** — open issues resolved, PRs merged, contributor count.

### Guardrail Metrics *(do not disturb)*
- **Page load latency** — the extension must not add > 100 ms to any page load.
- **AI platform compatibility** — zero increase in broken-UI reports on supported platforms (ChatGPT, Claude, Gemini, Perplexity, etc.).
- **User privacy** — API keys are stored locally only (never transmitted to any plenz server). Zero prompt data leaves the browser except to the user's own chosen LLM endpoint.

---

## Who Are the Users?

### Persona 1 — "The Casual Prompter"
- Non-technical knowledge worker (marketer, student, writer) who uses ChatGPT/Claude 3–5 times per day.
- Types short, vague prompts like *"write me an email"* and gets generic outputs, then spends multiple turns trying to refine.

### Persona 2 — "The Power User"
- Developer or data analyst running multi-turn sessions who experiences **context rot** after extended conversations — the original instructions get buried under debugging noise and the model starts hallucinating.
- Needs help compressing and clarifying prompts to preserve context window health.

### Persona 3 — "The Privacy-First User"
- Security-conscious professional who refuses to use tools that proxy their prompts through third-party servers.
- Wants full control: own Google login for preference sync, own API key, own model choice.

### Problems We Are Solving
- **Under-prompting:** Most users lack prompt-engineering skills and write vague queries, leading to poor AI outputs.
- **Context rot:** As conversations grow, LLMs lose track of earlier instructions; precise initial prompts reduce the need for long correction chains, keeping the context window clean.
- **Prompt iteration fatigue:** Users waste time rewriting the same prompt 3–4 times to get the desired output.
- **Vendor lock-in:** Existing prompt tools force users onto a specific LLM or require a paid subscription. Users want to choose their own model and only pay their own API costs.

### How We Know These Problems Exist
- Research from Chroma shows LLM performance measurably drops as input tokens increase — a phenomenon directly tied to noisy, under-specified prompts.
- Existing tools like Prompt Perfect and Promptimize have proven market demand, but many users reject them due to paywalls or lack of model flexibility.
- Community threads (Reddit, OpenAI forums) are filled with users reporting context rot and requesting automated prompt cleanup.
- The "Bring Your Own Key" (BYOK) pattern has been validated by open-source extensions that allow users to plug in their own API keys for LLM features.

---

## Solution

### Brief
**plenz** is an **open-source**, cross-browser extension that acts as a **real-time prompt co-pilot**. Like Grammarly suggests grammar fixes inline while you type, plenz detects when a user is typing in any AI chat input box and offers inline suggestions to enhance prompt clarity, add missing context, specify constraints, and define the desired output format. Suggestions appear as a non-intrusive overlay (tooltip or inline ghost text) that users can accept, modify, or dismiss with a single keystroke.

The tool is **completely free** — no paywall, no premium tier. Users authenticate via **Google Sign-In** (for syncing preferences and history across devices) and connect their own preferred LLM by providing an **API key** for any supported model provider.

### Authentication & Model Configuration Flow

#### Google Sign-In
1. On first launch, the extension popup presents a **"Sign in with Google"** button.
2. Authentication uses Chrome's `chrome.identity` API (Manifest V3) with OAuth 2.0 and the `userinfo.email` + `userinfo.profile` scopes.
3. For Firefox, the equivalent `browser.identity.launchWebAuthFlow()` is used.
4. Google Sign-In is used **only** for: syncing user preferences across devices, syncing accepted suggestion history (for personalization), and identifying the user in community/feedback features.
5. **No prompt data is ever sent to plenz servers.** Authentication tokens are stored locally via `chrome.storage.local`.

#### Model & API Key Configuration
1. After sign-in, the user is guided to the **Settings → Model Configuration** page.
2. The user selects their preferred LLM provider from a dropdown:
   - OpenAI (GPT-4o, GPT-4o-mini, etc.)
   - Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku, etc.)
   - Google (Gemini 1.5 Pro, Gemini 1.5 Flash, etc.)
   - Mistral (Mistral Large, Mistral Small, etc.)
   - Groq (Llama 3, Mixtral, etc.)
   - OpenRouter (access to 100+ models via a single key)
   - Custom / Self-hosted (user provides a base URL + key for any OpenAI-compatible API)
3. The user enters their **API key** in a password-masked input field.
4. A **"Test Connection"** button sends a minimal test prompt to verify the key works and displays the model's response latency.
5. API keys are stored **exclusively** in `chrome.storage.local` (encrypted at rest via the browser's built-in encryption). Keys are **never** transmitted to any plenz server.
6. Users can configure multiple models and switch between them via a quick-toggle in the extension popup.

### How the Core Tool Works
1. **Detection layer** — A content script identifies supported AI input fields (ChatGPT, Claude, Gemini, Perplexity, Copilot, etc.) via DOM selectors.
2. **Analysis engine** — As the user pauses typing (debounce ~500 ms), the prompt text is sent to the **user's own configured LLM endpoint** with a system prompt that evaluates it against a prompt-quality rubric (specificity, role, constraints, format, tone).
3. **Suggestion UI** — Refinement suggestions appear inline (ghost text) or in a compact popover. Users press `Tab` to accept, `Esc` to dismiss.
4. **Learning loop** — Accepted/rejected suggestions are stored locally and optionally synced (via Google account) to improve personalization over time.

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Standalone web app | Easier to build | Breaks workflow; requires copy-paste | ❌ Rejected |
| IDE plugin only | Strong for dev persona | Ignores 80% of target users | ❌ Rejected |
| Prompt template library (static) | Low effort | Doesn't adapt to user input in real time | ❌ Rejected |
| Hosted SaaS with own API | Seamless UX | Adds cost, privacy concerns, paywall needed | ❌ Rejected |
| **Open-source extension with BYOK** | **Free, private, flexible, community-driven** | **Requires user to have an API key** | ✅ **Selected** |

---

## Product Flow (Details)

### Customer Journey
1. User installs plenz from the Chrome/Firefox Web Store (free).
2. Extension popup opens → user clicks **"Sign in with Google"** → OAuth flow completes.
3. User is guided to **Settings → Model Configuration** → selects provider (e.g., OpenAI) → pastes API key → clicks **"Test Connection"** → sees ✅ success.
4. User navigates to any supported AI platform (e.g., ChatGPT).
5. User begins typing a prompt in the input box.
6. plenz analyzes the draft prompt via the user's configured model and displays a suggestion badge (e.g., *"⚡ +3 improvements available"*).
7. User hovers or presses a shortcut to see suggestions inline.
8. User accepts (`Tab`), edits, or dismisses (`Esc`) each suggestion.
9. Enhanced prompt is submitted to the AI platform → higher-quality first response.

### User Stories

| ID | User Story | Acceptance Criteria |
| --- | --- | --- |
| US-01 | As a new user, I want to sign in with my Google account so my preferences sync across devices. | Google OAuth flow completes in < 3 clicks; user profile (name, avatar) shown in popup after sign-in. |
| US-02 | As a user, I want to connect my preferred LLM by selecting a provider and entering my API key so the tool uses my own model. | Settings page shows provider dropdown with 7+ options; API key field is masked; "Test Connection" returns pass/fail within 5 s. |
| US-03 | As a user, I want to configure multiple models and switch between them quickly. | Settings allows saving up to 5 model configurations; a quick-toggle in the popup switches the active model in 1 click. |
| US-04 | As a casual user, I want to see prompt improvement suggestions while I type so I can get better AI answers without learning prompt engineering. | Suggestions appear within 1 s of pause; at least one suggestion shown for prompts < 20 words. |
| US-05 | As a power user, I want to accept suggestions with a keyboard shortcut so my flow isn't interrupted. | `Tab` accepts top suggestion; `Esc` dismisses; `↑/↓` navigates alternatives. |
| US-06 | As a privacy-conscious user, I want assurance that my API key and prompt data never leave my browser. | API key stored in `chrome.storage.local` only; network inspector shows zero calls to any plenz-owned domain with prompt/key data. |
| US-07 | As a user, I want plenz to work on ChatGPT, Claude, Gemini, and Perplexity out of the box. | Extension detects and hooks into input fields on all four platforms without errors. |
| US-08 | As a user, I want to see *why* a suggestion was made so I can learn better prompting over time. | Each suggestion includes a one-line rationale (e.g., "Adding a role improves output relevance"). |
| US-09 | As an open-source contributor, I want clear documentation and modular code so I can add support for new LLM providers. | README includes contribution guide; provider adapters follow a documented interface/plugin pattern. |

### Wireframes & Flow Diagrams

#### Screen 1: Onboarding / Sign-In
```
┌─────────────────────────────┐
│       🔍 plenz          │
│                             │
│   Refine your AI prompts    │
│   in real time.             │
│                             │
│  ┌───────────────────────┐  │
│  │  Sign in with Google  │  │
│  └───────────────────────┘  │
│                             │
│  Free & Open Source · v1.0  │
└─────────────────────────────┘
```

#### Screen 2: Model Configuration
```
┌─────────────────────────────┐
│  ⚙️ Settings                │
│                             │
│  Model Provider:            │
│  ┌─────────────────────┐    │
│  │ OpenAI         ▾    │    │
│  └─────────────────────┘    │
│                             │
│  Model:                     │
│  ┌─────────────────────┐    │
│  │ GPT-4o-mini    ▾    │    │
│  └─────────────────────┘    │
│                             │
│  API Key:                   │
│  ┌─────────────────────┐    │
│  │ ••••••••••••sk-xyz  │    │
│  └─────────────────────┘    │
│                             │
│  [Test Connection]  [Save]  │
│                             │
│  ✅ Connected · 230ms       │
└─────────────────────────────┘
```

#### Screen 3: Inline Suggestion (on AI chat page)
```
┌──────────────────────────────────────────┐
│  ChatGPT input box                       │
│                                          │
│  "write me an email"                     │
│  ┌────────────────────────────────────┐  │
│  │ ⚡ plenz suggests:            │  │
│  │                                    │  │
│  │ "Write a professional email to my  │  │
│  │  manager requesting PTO for March  │  │
│  │  10-14. Use a polite, concise      │  │
│  │  tone. Include subject line."      │  │
│  │                                    │  │
│  │  💡 Added: role, dates, tone,      │  │
│  │     format constraints             │  │
│  │                                    │  │
│  │  [Tab] Accept  [Esc] Dismiss       │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Edge Cases
- **No API key configured:** Show a friendly nudge — *"Add your API key in Settings to enable suggestions"* — instead of failing silently.
- **Invalid or expired API key:** Surface the provider's error message directly (e.g., "OpenAI: Invalid API key") with a link to Settings.
- **Empty or single-word prompts:** Show a starter template suggestion instead of refinement.
- **Non-English prompts:** Detect language; if the user's model supports it, provide suggestions in that language. Otherwise, display "language not yet supported."
- **Custom/unsupported AI platforms:** Provide a right-click context-menu fallback ("Enhance with plenz").
- **Conflicting extensions:** If Grammarly or another overlay extension is active, avoid z-index collisions by rendering suggestions in a shadow DOM container.
- **Rate limiting / API errors:** Queue suggestions and show a subtle "thinking…" indicator; if the error persists, show the raw API error so the user can troubleshoot.
- **User not signed in:** Allow full functionality without sign-in; sign-in is only required for cross-device sync.

### Event Tracking Sheet

> Note: All analytics are opt-in and processed locally or via a privacy-respecting, self-hostable analytics tool (e.g., Plausible, Umami).

| Event Name | Trigger | Properties |
| --- | --- | --- |
| `extension_installed` | First install | `browser`, `source`, `timestamp` |
| `google_sign_in` | User completes OAuth | `timestamp` |
| `model_configured` | User saves a model + key | `provider`, `model_name`, `latency_ms` |
| `suggestion_shown` | Suggestion overlay appears | `platform`, `prompt_length`, `suggestion_count` |
| `suggestion_accepted` | User presses Tab / clicks accept | `suggestion_type`, `prompt_before_length`, `prompt_after_length` |
| `suggestion_dismissed` | User presses Esc / clicks dismiss | `suggestion_type` |
| `settings_changed` | User modifies preferences | `setting_key`, `old_value`, `new_value` |
| `session_started` | User begins typing in supported field | `platform`, `url_domain` |

---

## Technical Architecture (Open Source)

### Repository Structure
```
plenz/
├── manifest.json          # Manifest V3 (Chrome) / V2 (Firefox compat)
├── src/
│   ├── background/        # Service worker: auth, storage, message routing
│   ├── content/           # Content scripts: DOM detection, suggestion UI
│   ├── popup/             # Extension popup: sign-in, quick settings
│   ├── options/           # Full settings page: model config, preferences
│   ├── providers/         # LLM provider adapters (plugin pattern)
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── google.ts
│   │   ├── mistral.ts
│   │   ├── groq.ts
│   │   ├── openrouter.ts
│   │   └── custom.ts
│   ├── core/              # Prompt analysis engine, rubric, suggestion logic
│   └── utils/             # Shared helpers, encryption, storage wrappers
├── tests/                 # Unit + integration tests
├── docs/                  # Contribution guide, architecture docs
├── LICENSE                # MIT License
└── README.md
```

### Key Technical Decisions
- **Manifest V3** for Chrome (with V2 fallback for Firefox where needed).
- **TypeScript** for type safety and contributor experience.
- **Shadow DOM** for suggestion UI to avoid CSS/z-index conflicts with host pages.
- **Provider adapter pattern** — each LLM provider implements a standard interface (`analyze(prompt) → Suggestion[]`), making it trivial for contributors to add new providers.
- **All API calls go directly from the browser to the user's chosen provider** — no intermediary server.
- **`chrome.storage.local`** for API keys and preferences; **`chrome.storage.sync`** (via Google account) for non-sensitive preferences only.

### License
**MIT License** — fully open source, free to use, modify, and distribute.

---

## Tentative Timelines

| Task | Target Date |
| --- | --- |
| Leadership / stakeholder approval | Feb 21, 2026 |
| Design ready (Figma mockups + prototype) | Mar 14, 2026 |
| Prototype user testing (10 users) | Mar 28, 2026 |
| Development starts | Apr 6, 2026 |
| Alpha release (internal + GitHub) | May 18, 2026 |
| Beta launch (Chrome Web Store, public repo) | Jun 15, 2026 |
| Firefox Add-ons release | Jul 6, 2026 |
| Public launch v1.0 (Chrome + Firefox) | Jul 20, 2026 |

---

## Dependencies

### Open Questions
- Which privacy-respecting analytics tool should be used (Plausible, Umami, or PostHog self-hosted)?
- Should the system prompt for the analysis engine be user-customizable (advanced mode)?
- Should we support on-device / local models (e.g., via WebLLM or Ollama localhost) as a provider option for fully offline use?

### Infrastructure Requirements
- **No backend server required** — all processing happens client-side via the user's own API key.
- GitHub repository with CI/CD (GitHub Actions) for build, test, and Web Store deployment.
- Optional: lightweight sync server (Firebase free tier / Supabase free tier) for cross-device preference sync via Google account.

### Budget Approvals
- Chrome & Firefox Web Store developer accounts (~$5 one-time for Chrome).
- Design tooling (Figma — free tier sufficient for MVP).
- User testing incentives (optional, ~$200 for 10-user beta test).
- Domain for project landing page (optional, ~$12/year).

### Partner Support
- **Chrome/Firefox extension review** — pre-review for compliance with store policies (especially around `identity` and `activeTab` permissions).

### Internal Dependencies
- **Design** — UI/UX for popup, settings page, inline suggestion overlay, and onboarding flow.
- **Development** — Content scripts, provider adapters, OAuth integration, suggestion engine.
- **Community** — README, contribution guide, issue templates, and code of conduct for the open-source repo.

---

## Related Documents

1. Tech planning document *(to be created)*
2. Design planning document *(to be created)*
3. Go-to-market / community launch planning *(to be created)*
4. GitHub repository setup & contribution guide *(to be created)*

