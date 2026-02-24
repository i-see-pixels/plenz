# PromptLens Features List

This document tracks the implementation status of features outlined in the PRD and Tech Planning documents.

## 🟢 Core & Providers (Done/Functional)

| Feature                   | Status  | Description                                                         |
| ------------------------- | ------- | ------------------------------------------------------------------- |
| **OpenAI Adapter**        | ✅ Done | Full support for GPT-4o and GPT-4o-mini.                            |
| **Google Gemini Adapter** | ✅ Done | Support for Gemini 1.5 Pro/Flash.                                   |
| **Prompt Quality Rubric** | ✅ Done | System prompt template based on 6-dimension rubric.                 |
| **Secure local storage**  | ✅ Done | API keys and model configurations stored in `chrome.storage.local`. |
| **Connection Testing**    | ✅ Done | Verify API keys and measure latency from settings page.             |

## 🟡 In Progress / Partial

| Feature                | Status     | Description                                                                                         |
| ---------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| **Platform Detection** | ✅ Done    | Supports ChatGPT, Claude, Gemini, and Perplexity.                                                   |
| **Suggestion UI**      | ✅ Done    | Overlay interaction (Arrows/Tab/Esc) implemented. Real analysis integrated. Ghost-text implemented. |
| **Active Model Sync**  | 🟡 Partial | Fixed storage logic to sync active model between settings and popup.                                |

## 🔴 Pending / Backlog (To be Built)

### Browser Extension

- [ ] **Google OAuth Sign-In**: Implement `chrome.identity` flow for preference syncing.
- [ ] **Additional Providers**: Add Anthropic, Mistral, Groq, and OpenRouter adapters.
- [ ] **Custom Provider**: Allow user-defined base URLs for OpenAI-compatible local/self-hosted LLMs.
- [ ] **Onboarding Wizard**: Step-by-step guide for first-time users (Auth -> Provider Config).
- [ ] **Analytics Dashboard**: Implement opt-in usage stats and performance metrics (Umami).
- [ ] **Context Menu Fallback**: "Enhance with PromptLens" option for unsupported text fields.
- [ ] **Debounce & Cache**: Advanced LRU caching for analysis results to save API tokens.

### VSCode Extension

- [ ] **Refine Selection**: Implement the `promptlens.refine` command to analyze and replace selected text.
- [ ] **IDE Configuration**: Sync settings between the browser extension and VSCode.

### Core Engine

- [ ] **Multi-turn Context**: Support for analyzing prompts based on conversation history.
- [ ] **Suggestion Personalization**: Learn from accepted/rejected suggestions (requires Auth).

---

_Created: February 15, 2026_
