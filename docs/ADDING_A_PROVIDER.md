# Adding a Provider

## 1. Implement `ProviderAdapter`

Create a new file under `packages/providers/src/` and implement the adapter interface from `@plenz/types`.

Required methods:
- `testConnection(config)`
- `analyze(prompt, systemPrompt, config)`

## 2. Normalize Suggestions

Return suggestions matching shared `Suggestion` shape:
- `id`
- `type`
- `original`
- `suggested`
- `rationale`
- `confidence`

## 3. Register the Provider

Export the adapter and add it to `providers` in `packages/providers/src/index.ts`.

## 4. Configure API Domain Access

If your provider requires a new API host, update:
- `apps/extension/public/manifest.json`
  - `host_permissions`
  - `content_security_policy.extension_pages` `connect-src`

## 5. Add Tests

Add adapter unit tests for:
- Success path normalization.
- Invalid JSON / malformed responses.
- Error handling and auth failures.

