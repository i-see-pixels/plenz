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

1. The content script picks the site's editor adapter (`apps/extension/src/content/editors/`), which finds the composer, reads the draft and chat messages, and writes text back through the editor's own input path (`insertText`, then paste, then a direct DOM write, each checked before moving on) so the page's undo keeps working.
2. As the user types, the content script lints the draft locally (`lintPrompt` in `@plenz/core`): deterministic rubric checks with a score and up to three chips on the badge. No network call.
3. Clicking the badge opens the refine panel's mode picker (Improve, Tighten, Structure, Ask me) without calling the provider. Picking a mode, or pressing Ctrl/Cmd+Shift+Enter for Improve, starts a refine. With "Refine automatically while typing" on, Improve also runs in the background after a debounced pause and the badge shows "Ready" when it finishes.
4. Each refine opens a `chrome.runtime.Port` (`apps/extension/src/shared/refine-port.ts`) and sends `START`. The background builds the mode's prompt (`buildRefineRequest` in `@plenz/core`) and streams the provider's reply back as `DELTA` chunks, then one `DONE` (cleaned text), `QUESTIONS` (Ask me) or `ERROR`.
5. Closing the port (typing, Esc, switching mode, navigating away) aborts the provider request. Retries and the opt-in fallback to other providers only happen before the first chunk reaches the user; a stalled stream times out. Failures are explained by `describeRefineError` (`apps/extension/src/shared/refine-errors.ts`) from the HTTP status and provider wording: rejected key, missing model, rate limit or quota, draft too long, offline or unreachable, timeout, provider outage. `ERROR` carries that plain message, the provider's own text as `detail`, and `fixInSettings`, which makes the panel offer "Open settings" (`OPEN_SETTINGS`).
6. Ask me is two steps: the questions come back first, the user answers what they can, and a `compose` refine writes the prompt from the answers.
7. The finished prompt is shown as a word-level diff against the draft (`diffPrompts` in `@plenz/core`), or as the plain result when the rewrite is mostly new text. Clicking a change keeps the draft's wording there; "Replace prompt" (or Tab in the chat input) writes the accepted changes only (`applyDiff`). Esc closes the panel.
8. After a replace the badge offers Undo, which restores the previous draft. It stays available until the chat input is edited.
9. The mode picker also lists the user's context cards (`apps/extension/src/shared/context-cards.ts`), which the options page saves to `chrome.storage.local` under `contextCards` and the content script reads directly. Clicking one writes it above the draft (`withCard`) through the same write path, with the same Undo; no provider call.
10. Typing `/` at the start of the draft's last line opens the `/` menu (`apps/extension/src/content/slash.ts`, `ui/SlashMenu.ts`). It lists context cards plus saved and trending gallery prompts from `LIST_INSERTABLE_PROMPTS`, which the background caches for a minute (`background/insertable-prompts.ts`) and which returns titles and text only. Arrow keys choose, Enter or Tab inserts (the `/query` line is replaced, with Undo), Esc closes. While the menu is open those keys are taken at window capture so they never reach the site.
11. Local learning (`apps/extension/src/shared/learning.ts`). The content machine emits `recordRefine` when a visible result is replaced (accepted) or closed or swapped for another mode (dismissed); on chat sites, Enter in the composer counts as sending the draft, and the checks still flagged then are recorded as ignored, while those flagged earlier on the draft and gone are recorded as fixed. Events go to the background over `RECORD_LEARNING`, which validates them and applies them one at a time to `chrome.storage.local` under `learning` (`background/learning-store.ts`); counts are halved past a cap so recent use matters most. The content script reads the stats back: the mode with enough accepts becomes the picker's suggestion (unless the draft calls for Tighten), and checks ignored at least five times and more than three times as often as fixed are dropped from the badge, its score and the Improve request. Settings shows the result and can reset it (`RESET_LEARNING`).

The badge, refine panel and `/` menu follow the page they sit on rather than the OS theme: when one appears, `followPageTheme` (`content/ui/theme.ts`) checks the first mostly opaque background behind the chat box and switches the overlay's variables to the dark set if it is dark.

## First Run

- On first install (not updates) the background opens the welcome page (`apps/extension/src/welcome/`): connect a model with the same `ModelConfig` as settings, try it on a chat site, and optionally sign in. The manifest doesn't name this page, so `vite.config.ts` adds it as a build input.
- `setupState` (`apps/extension/src/shared/setup.ts`) mirrors the orchestrator's choice: a configured provider, else Chrome's on-device model when it's available, else setup is needed. The welcome page and popup read it through `useSetupState`, which re-checks on any storage change. Until refines can run, the popup leads with "Finish setup", which reopens the welcome page.

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
- Cloud Sync is end to end encrypted (`apps/extension/src/background/vault-crypto.ts`, `sync-vault.ts`). A random AES-256 data key encrypts each API key, with the account and provider bound in as additional data. The data key is wrapped with a key derived from the user's passphrase (PBKDF2-SHA-256, 600,000 iterations, random salt) and stored at `users/{uid}/sync/vault`; the passphrase and data key never leave the device. An unlocked device keeps the data key in `chrome.storage.local` until it is locked or the user signs out. Writes need the data key, so nothing weaker is written; records from older versions are re-encrypted on setup or unlock.
- No centralized plenz prompt-processing server.
- Content scripts can only read preferences over messaging and open refine ports; the port validates every `START` and never returns keys or configs. Everything else (model configs, keys, auth, gallery) is limited to extension pages.
- Extension outbound network access restricted in manifest CSP and host permissions.

