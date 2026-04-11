# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.4] - 2026-04-11

### Added

- Support for multiple LLM providers:
  - Anthropic, Groq, Mistral, OpenRouter.
  - Custom adapter support for arbitrary OpenAI-compatible endpoints.
- Support for additional chat platforms:
  - Claude (claude.ai) and Perplexity (perplexity.ai).
- Real-time prompt analysis engine with debounced input detection.
- Interactive suggestion overlay with keyboard navigation (`ArrowUp`/`ArrowDown`).
- Ghost text (grayed-out completion) for top suggestions, accepted via `Tab`.
- Status badge indicators for real-time analysis feedback and error reporting.
- Local-first credential storage (BYOK) using `chrome.storage.local`.
- Next.js-based landing page and web dashboard with Framer Motion animations.
- GitHub Actions workflows for CI (lint, types, build), E2E testing (Playwright), and CodeQL.
- Open-source governance: LICENSE, CODE_OF_CONDUCT.md, CONTRIBUTING.md, and SECURITY.md.
- Standardized issue templates and PR templates.

### Changed

- Migrated codebase to a Turborepo-managed monorepo structure.
- Enhanced platform detection and input hooking logic for better editor stability.
- Standardized UI components using a shared `@plenz/ui` package.

## [0.1.0-alpha] - 2026-02-17

### Added

- Initial monorepo structure for browser extension, web app, and VS Code extension.
- Prompt analysis engine and provider adapter interfaces.
- OpenAI and Google provider implementations.
- Initial extension content script overlays and platform registry support.
