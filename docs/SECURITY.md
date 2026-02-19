# Security Notes

This document complements the root `SECURITY.md`.

## Key Principles

- BYOK: users supply and store their own provider API keys.
- Local-first: no PromptLens backend for prompt processing.
- Least privilege: extension host permissions are scoped to provider API domains.

## Browser Extension Controls

- Manifest `host_permissions` restricted to known provider APIs.
- Manifest `content_security_policy` sets explicit `connect-src`.

## Operational Security

- Run dependency updates via Dependabot.
- Enable GitHub CodeQL and secret scanning.
- Perform security review before each beta or public release.
