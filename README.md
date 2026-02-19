# PromptLens

Open-source browser extension for real-time AI prompt refinement. Like Grammarly, but for AI prompts.

![PromptLens Logo](assets/PromptLensLogo.svg)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/promptlens/promptlens/actions/workflows/ci.yml/badge.svg)](https://github.com/promptlens/promptlens/actions/workflows/ci.yml)
[![E2E](https://github.com/promptlens/promptlens/actions/workflows/e2e.yml/badge.svg)](https://github.com/promptlens/promptlens/actions/workflows/e2e.yml)
[![CodeQL](https://github.com/promptlens/promptlens/actions/workflows/codeql.yml/badge.svg)](https://github.com/promptlens/promptlens/actions/workflows/codeql.yml)

## Features

- Real-time prompt analysis while typing.
- Ranked prompt improvement suggestions.
- One-click suggestion apply into chat editors.
- Provider-agnostic architecture with BYOK.
- Works across multiple AI chat platforms.

## Monorepo Structure

- `apps/extension`: Browser extension (Vite + Preact).
- `apps/web`: Landing page and web app (Next.js).
- `apps/vscode`: VS Code extension.
- `packages/core`: Prompt analysis logic and system prompt template.
- `packages/providers`: LLM provider adapters.
- `packages/types`: Shared TypeScript contracts.

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
2. Configure provider/model and API key in PromptLens settings.
3. Open a supported chat platform and start typing.
4. Accept or click suggestions to improve prompt quality.

## Supported Platforms

| Platform | Status |
| --- | --- |
| ChatGPT | Supported |
| Claude | Supported |
| Gemini | Supported |
| Perplexity | Supported |
| Copilot | Planned |

## Supported Providers

| Provider | Status |
| --- | --- |
| OpenAI | Supported |
| Google | Supported |
| Anthropic | Planned |
| Mistral | Planned |
| Groq | Planned |
| OpenRouter | Planned |
| Custom Adapter | Planned |

## Privacy and Security

- BYOK (bring your own key).
- Local-first storage for credentials.
- No central PromptLens backend for prompt processing.
- Restricted extension host permissions and CSP for provider domains.

## Development

- `pnpm dev`
- `pnpm build`
- `pnpm type-check`

Detailed setup: `DEVELOPMENT.md`

## Contributing

[![Good First Issues](https://img.shields.io/github/issues/promptlens/promptlens/good%20first%20issue)](https://github.com/promptlens/promptlens/labels/good%20first%20issue)

Please read `docs/CONTRIBUTING.md`.

## Roadmap

Roadmap and milestones are maintained in the GitHub project board and milestones.

## License

MIT. See `LICENSE`.

## Acknowledgments

- Open-source maintainer community and early contributors.
