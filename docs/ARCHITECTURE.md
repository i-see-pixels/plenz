# plenz Architecture

## Overview

plenz is a monorepo with three user-facing applications:
- Browser extension (`apps/extension`)
- Web app (`apps/web`)
- VS Code extension (`apps/vscode`)

Shared logic lives in:
- `packages/core`: prompt analysis orchestration and system prompt templates
- `packages/providers`: LLM provider adapters
- `packages/types`: shared TypeScript contracts

## Browser Extension Data Flow

1. Content script detects supported platform input areas.
2. User prompt is observed and debounced.
3. Content script sends `ANALYZE_PROMPT` to the background worker. Typing again sends `CANCEL_ANALYSIS`, and a newer request from the same tab/frame aborts the older one, so outdated provider calls stop.
4. Background routes request through configured provider adapter. Other configured providers are tried only if the user enables "Fall back to other providers".
5. Provider returns normalized suggestions.
6. Content script shows a badge with the suggestion count. Clicking it or pressing Tab in the chat input opens the popover; while it is open, Tab applies, Esc dismisses and ↑/↓ navigate. Typing closes it.

## Provider Layer

- Each provider implements `ProviderAdapter`.
- Adapters handle auth headers, request shaping, and response normalization.
- Current providers:
  - OpenAI
  - Google Gemini
  - Anthropic
  - Mistral
  - Groq
  - OpenRouter
  - Custom (OpenAI-compatible base URL)

## Security Model

- BYOK architecture with local key storage.
- No centralized plenz prompt-processing server.
- The background router only accepts `ANALYZE_PROMPT`, `CANCEL_ANALYSIS` and `GET_PREFERENCES` from content scripts. Everything else (model configs, keys, auth, gallery) is limited to extension pages.
- Extension outbound network access restricted in manifest CSP and host permissions.

