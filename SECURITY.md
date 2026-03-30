# Security Policy

## Supported Versions

Only the latest `main` branch and the latest tagged release are supported.

## Reporting a Vulnerability

- Email: `siddhant06137@gmail.com`
- Include reproduction steps, impact, and affected components.
- Do not open public GitHub issues for undisclosed vulnerabilities.

We will acknowledge reports within 72 hours and provide follow-up status updates.

## Security Scope

- PromptLens is designed as a BYOK (bring your own key) extension.
- API keys are stored locally via browser extension storage.
- When the Firebase Cloud Sync backend is enabled, PromptLens encrypts the `apiKey` field client-side before writing provider settings to Firestore.
- This Firebase encryption is intentionally limited to removing plaintext API keys from database records. It is not equivalent to passphrase-based encryption or backend KMS-backed secret management, and local browser-stored copies are unchanged.
- PromptLens does not run a central backend for prompt processing.
- The extension uses restrictive `connect-src` policies and explicit API hosts.

## Disclosure Process

- Report received and triaged.
- Fix developed and validated.
- Coordinated disclosure with reporter.
- Public advisory published after fix release.
