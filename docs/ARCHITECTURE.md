# plenz Architecture

## Overview

plenz is a monorepo with three user-facing applications:
- Browser extension (`apps/extension`)
- Web app (`apps/web`)
- VS Code extension (`apps/vscode`)

Shared logic lives in:
- `packages/core`: the local prompt linter, refine-mode prompts and output cleanup, and chat-context building
- `packages/providers`: LLM provider adapters
- `packages/types`: shared TypeScript contracts

## Browser Extension Data Flow

1. The content script picks the site's editor adapter (`apps/extension/src/content/editors/`), which finds the composer, reads the draft and chat messages, and writes text back through the editor's own input path (paste, then `insertText`, then a direct DOM write) so the page's undo keeps working.
2. As the user types, the content script lints the draft locally (`lintPrompt` in `@plenz/core`): deterministic rubric checks with a score and up to three chips on the badge. No network call.
3. Clicking the badge opens the refine panel's mode picker (Improve, Tighten, Structure, Ask me) without calling the provider. Picking a mode, or pressing Ctrl/Cmd+Shift+Enter for Improve, starts a refine. With "Refine automatically while typing" on, Improve also runs in the background after a debounced pause and the badge shows "Ready" when it finishes.
4. Each refine opens a `chrome.runtime.Port` (`apps/extension/src/shared/refine-port.ts`) and sends `START`. The background builds the mode's prompt (`buildRefineRequest` in `@plenz/core`) and streams the provider's reply back as `DELTA` chunks, then one `DONE` (cleaned text), `QUESTIONS` (Ask me) or `ERROR`.
5. Closing the port (typing, Esc, switching mode, navigating away) aborts the provider request. Retries and the opt-in fallback to other providers only happen before the first chunk reaches the user; a stalled stream times out.
6. Ask me is two steps: the questions come back first, the user answers what they can, and a `compose` refine writes the prompt from the answers.
7. The finished prompt is shown as a word-level diff against the draft (`diffPrompts` in `@plenz/core`), or as the plain result when the rewrite is mostly new text. Clicking a change keeps the draft's wording there; "Replace prompt" (or Tab in the chat input) writes the accepted changes only (`applyDiff`). Esc closes the panel.
8. After a replace the badge offers Undo, which restores the previous draft. It stays available until the chat input is edited.

## Other Sites

- The manifest only injects the content script on the supported chat sites. For any other site, the popup's "Use plenz on [site]" asks for that site's optional host permission, and the background registers the content script for it with `chrome.scripting` (`apps/extension/src/background/sites.ts`).
- On those sites the generic editor adapter uses whichever multi-line text box the user focuses, including inside open shadow roots. Single-line inputs are never used, and there is no chat transcript to read.
- The registered script is a self-contained IIFE built by `vite.site-script.config.ts`, so it needs no `web_accessible_resources`. Exposing the crxjs loader's chunks to every site would let any page detect the extension.
- Chrome may close the popup while its permission prompt is open, so the popup records the pending site first and `permissions.onAdded` finishes enabling it.

## Provider Layer

- Four adapters implement `ProviderAdapter`, whose core method is `streamCompletion({ system, user }, config, { signal, onDelta })`:
  - OpenAI-compatible, with presets for OpenAI, Mistral, Groq, OpenRouter and Custom (any OpenAI-compatible base URL, Ollama by default). Servers that ignore `stream` are read as a single reply.
  - Anthropic Messages API streaming
  - Google Gemini `streamGenerateContent`, with a system instruction
  - On-device: Chrome's built-in Gemini Nano through the Prompt API (`on-device.ts`), feature-detected at runtime
- Adapters know nothing about modes; the HTTP ones share one server-sent-events parser (`sse.ts`).
- A provider counts as configured when it has a model, plus a key unless its adapter sets `needsApiKey: false` (on-device, Custom). With nothing configured, refines use the on-device model if it is already downloaded. A refine never starts the multi-GB download; that only happens from the "Download model" button in settings, whose click Chrome requires.

## Messaging

- Every message between extension pages, content scripts and the background worker is defined once in `apps/extension/src/shared/rpc.ts`, with its payload and reply types.
- Senders use `sendRpc(type, payload)`. The router is a handler table typed against the same map, so a message without a handler fails the type-check.

## Security Model

- BYOK architecture with local key storage.
- No centralized plenz prompt-processing server.
- Content scripts can only read preferences over messaging and open refine ports; the port validates every `START` and never returns keys or configs. Everything else (model configs, keys, auth, gallery) is limited to extension pages.
- Extension outbound network access restricted in manifest CSP and host permissions.

