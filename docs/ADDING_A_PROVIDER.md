# Adding a Provider

There are three adapters in `packages/providers/src/`:
- `openai-compatible.ts`: any OpenAI-compatible chat completions API, configured by presets
- `anthropic.ts`: the Anthropic Messages API
- `google.ts`: the Gemini API

Every adapter streams plain text through `streamCompletion({ system, user }, config, { signal, onDelta })`. Prompts for the refine modes are built in `@plenz/core`, so adapters stay mode-agnostic.

## 1. OpenAI-compatible APIs: add a preset

Most providers speak the OpenAI chat completions API. Add an entry to `OPENAI_COMPATIBLE_PRESETS` in `openai-compatible.ts`:
- `id`: stored with the user's config; never change it once shipped
- `name`: shown in settings
- `baseUrl`: the vendor's base URL (omit it to use the user's own URL, like `custom`)
- `requiresKey`: skip the models request when there is no key
- `headers`: any extra headers the vendor wants
- `toModels`: map the `/models` response to `ModelOption[]`

Then register it in `providers` in `packages/providers/src/index.ts` with `openAICompatible("<id>")`.

## 2. Other APIs: implement `ProviderAdapter`

Create a file implementing the `ProviderAdapter` interface from `@plenz/types` (`fetchModels`, `testConnection`, `streamCompletion`). Set `needsApiKey: false` if it works without a key, as `on-device.ts` does. Call `onDelta` with each text chunk as it arrives, honour `signal` so cancelled refines stop, and resolve with the full text. If the API streams server-sent events, use `readSSE` from `sse.ts`.

## 3. Configure API Domain Access

If your provider requires a new API host, update:
- `apps/extension/public/manifest.json`
  - `host_permissions`
  - `content_security_policy.extension_pages` `connect-src`

## 4. Add Tests

The SSE parser and endpoint helpers are covered by `pnpm -C packages/providers test`. Add cases there for any new stream format your provider uses.
