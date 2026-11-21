<a href="https://plenz.siddsingh.dev" target="_blank" rel="noopener">
  <picture>
    <img alt="plenz" src="assets/banner.png" />
  </picture>
</a>

<div align="center">
  <h3>Open-source extension for real-time AI prompt refinement.<br />Like Grammarly, but for AI prompts.</h3>
  <a href="LICENSE">
    <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-green.svg" />
  </a>
  <a href="https://github.com/i-see-pixels/plenz/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/i-see-pixels/plenz/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://github.com/i-see-pixels/plenz/actions/workflows/e2e.yml">
    <img alt="E2E" src="https://github.com/i-see-pixels/plenz/actions/workflows/e2e.yml/badge.svg" />
  </a>
   <a href="https://github.com/i-see-pixels/plenz/actions/workflows/codeql.yml">
      <img alt="CodeQL" src="https://github.com/i-see-pixels/plenz/actions/workflows/codeql.yml/badge.svg" />
   </a>
  <br />
  <a href="https://twitter.com/creatorsidd">
    <img alt="Twitter" src="https://img.shields.io/twitter/url.svg?label=%40creatorsidd&style=social&url=https%3A%2F%2Ftwitter.com%2Fcreatorsidd" />
  </a>
  <br />
</div>

<br />

## Features

- Free local prompt check while typing: a score and chips like "No output format", with no API call.
- AI refine on demand, streamed as it's written: Improve, Tighten (shorter, same requirements), Structure (labeled sections), or Ask me (answer 2–3 questions, then get the prompt).
- Click the badge to pick a mode, or press Ctrl/Cmd+Shift+Enter for Improve; opt in to refine automatically after a pause.
- Context cards: save notes you keep retyping (about you, a project, a tone) in settings and add one above your draft from the refine panel in one click. Stored on this device only.
- Type `/` at the start of a line in the chat box to search your context cards, saved prompts and the gallery's trending prompts, then press Enter to insert one.
- Learns locally: the refine mode you keep accepting becomes the suggested one, and a prompt check you keep sending past stops being shown. See or reset it in settings; it never leaves your device.
- See exactly what changed: a word-level diff where you can keep your own wording for any change, then replace in one click, with Undo.
- Provider-agnostic architecture with BYOK.
- Works on ChatGPT, Claude, Gemini and Perplexity, and on any other site you turn it on for from the popup.

## Star History

<a href="https://www.star-history.com/?repos=i-see-pixels%2Fplenz&type=date&logscale=&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=i-see-pixels/plenz&type=date&theme=dark&logscale&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=i-see-pixels/plenz&type=date&logscale&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=i-see-pixels/plenz&type=date&logscale&legend=top-left" />
 </picture>
</a>

## Monorepo Structure

- `apps/extension`: Browser extension (Vite + Preact).
- `apps/web`: Landing page and web app (Next.js).
- `apps/vscode`: VS Code extension.
- `packages/core`: Prompt analysis logic and system prompt template.
- `packages/providers`: LLM provider adapters.
- `packages/types`: Shared TypeScript contracts.
- `packages/ui`: Shared shadcn primitives and UI tokens for web + extension.

## Installation

### Manual (from source)

1. Install dependencies:
   - `pnpm install`
2. Build extension:
   - `pnpm build:chrome`
3. Load unpacked extension from:
   - `apps/extension/dist`

### Store links

- Chrome Web Store: coming soon
- Firefox Add-ons: coming soon

## Quick Start

1. Load the extension in your browser.
2. Configure provider/model and API key in plenz settings.
3. Open a supported chat platform and start typing.
4. Accept or click suggestions to improve prompt quality.

## Supported Platforms

| Platform       | Status                                                                          |
| -------------- | ------------------------------------------------------------------------------- |
| ChatGPT        | Supported                                                                       |
| Claude         | Supported                                                                       |
| Gemini         | Supported                                                                       |
| Perplexity     | Supported                                                                       |
| Any other site | Supported when you turn it on from the popup (uses the text box you click into) |
| Copilot        | Planned                                                                         |

## Supported Providers

| Provider                         | Status                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| OpenAI                           | Supported                                                                                        |
| Google                           | Supported                                                                                        |
| Anthropic                        | Supported                                                                                        |
| Mistral                          | Supported                                                                                        |
| Groq                             | Supported                                                                                        |
| OpenRouter                       | Supported                                                                                        |
| Custom Adapter                   | Supported                                                                                        |
| On-device (Chrome's Gemini Nano) | Supported, no API key; used automatically when no provider is set up and the model is downloaded |

## Privacy and Security

- BYOK (bring your own key).
- Local-first storage for credentials.
- No central plenz backend for prompt processing.
- Restricted extension host permissions and CSP for provider domains.

## Development

- `pnpm dev`
- `pnpm build`
- `pnpm type-check`

Detailed setup: `DEVELOPMENT.md`

## Contributing

[![Good First Issues](https://img.shields.io/github/issues/i-see-pixels/plenz/good%20first%20issue)](https://github.com/i-see-pixels/plenz/labels/good%20first%20issue)

Please read `docs/CONTRIBUTING.md`.

## Roadmap

Roadmap and milestones are maintained in the GitHub project board and milestones.

## License

MIT. See `LICENSE`.

## Acknowledgments

- Open-source maintainer community and early contributors.
