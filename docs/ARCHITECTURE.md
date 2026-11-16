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
2. As the user types, the content script lints the draft locally (`lintPrompt` in `@plenz/core`): deterministic rubric checks with a score and up to three chips on the badge. No network call.
3. On request (badge click or Ctrl/Cmd+Shift+Enter), or after a debounced pause when "Refine automatically while typing" is on, the content script sends `ANALYZE_PROMPT` to the background worker. Typing again sends `CANCEL_ANALYSIS`, and a newer request from the same tab/frame aborts the older one, so outdated provider calls stop.
4. Background routes request through configured provider adapter. Other configured providers are tried only if the user enables "Fall back to other providers".
5. Provider returns normalized suggestions.
6. Content script shows a badge with the suggestion count. Clicking it or pressing Tab in the chat input opens the popover; while it is open, Tab applies, Esc dismisses and ↑/↓ navigate. Typing closes it.

## Provider Layer

- Three adapters implement `ProviderAdapter`:
  - OpenAI-compatible, with presets for OpenAI, Mistral, Groq, OpenRouter and Custom (any OpenAI-compatible base URL, Ollama by default)
  - Anthropic, using forced tool use so suggestions come back as structured input
  - Google Gemini, with a system instruction and JSON response mode
- All three share one parse step (`response-parsing.ts`): JSON extraction, recovery of complete suggestions from truncated output, and normalization. `@plenz/core` then filters for quality.

## Messaging

- Every message between extension pages, content scripts and the background worker is defined once in `apps/extension/src/shared/rpc.ts`, with its payload and reply types.
- Senders use `sendRpc(type, payload)`. The router is a handler table typed against the same map, so a message without a handler fails the type-check.

## Security Model

- BYOK architecture with local key storage.
- No centralized plenz prompt-processing server.
- The background router only accepts `ANALYZE_PROMPT`, `CANCEL_ANALYSIS` and `GET_PREFERENCES` from content scripts. Everything else (model configs, keys, auth, gallery) is limited to extension pages.
- Extension outbound network access restricted in manifest CSP and host permissions.

