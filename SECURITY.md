# Security Policy

## Supported Versions

Only the latest `main` branch and the latest tagged release are supported.

## Reporting a Vulnerability

- Email: `security@promptlens.dev`
- Include reproduction steps, impact, and affected components.
- Do not open public GitHub issues for undisclosed vulnerabilities.

We will acknowledge reports within 72 hours and provide follow-up status updates.

## Security Scope

- PromptLens is designed as a BYOK (bring your own key) extension.
- API keys are stored locally via browser extension storage.
- PromptLens does not run a central backend for prompt processing.
- The extension uses restrictive `connect-src` policies and explicit API hosts.

## Disclosure Process

- Report received and triaged.
- Fix developed and validated.
- Coordinated disclosure with reporter.
- Public advisory published after fix release.
