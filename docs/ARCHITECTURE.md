# PromptLens Architecture

## Overview

PromptLens is a monorepo with three user-facing applications:
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
3. Content script sends `ANALYZE_PROMPT` to the background worker.
4. Background routes request through configured provider adapter.
5. Provider returns normalized suggestions.
6. Content script renders overlay/ghost suggestions and can apply selected text back into the platform editor.

## Provider Layer

- Each provider implements `ProviderAdapter`.
- Adapters handle auth headers, request shaping, and response normalization.
- Current providers:
  - OpenAI
  - Google Gemini

## Security Model

- BYOK architecture with local key storage.
- No centralized PromptLens prompt-processing server.
- Extension outbound network access restricted in manifest CSP and host permissions.
