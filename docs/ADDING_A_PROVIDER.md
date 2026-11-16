# Adding a Provider

There are three adapters in `packages/providers/src/`:
- `openai-compatible.ts`: any OpenAI-compatible chat completions API, configured by presets
- `anthropic.ts`: the Anthropic Messages API (forced tool use for structured output)
- `google.ts`: the Gemini API

## 1. OpenAI-compatible APIs: add a preset

Most providers speak the OpenAI chat completions API. Add an entry to `OPENAI_COMPATIBLE_PRESETS` in `openai-compatible.ts`:
- `id`: stored with the user's config; never change it once shipped
- `name`: shown in settings
- `baseUrl`: the vendor's base URL (omit it to use the user's own URL, like `custom`)
- `requiresKey`: skip the models request when there is no key
- `jsonMode`: send `response_format: { type: "json_object" }` only if the API supports it
- `headers`: any extra headers the vendor wants
- `toModels`: map the `/models` response to `ModelOption[]`

Then register it in `providers` in `packages/providers/src/index.ts` with `openAICompatible("<id>")`.

## 2. Other APIs: implement `ProviderAdapter`

Create a file implementing the `ProviderAdapter` interface from `@plenz/types` (`fetchModels`, `testConnection`, `analyze`). Prefer the API's structured-output or tool-calling mode, and pass model text through `parseSuggestionsText` from `response-parsing.ts`. It handles fenced JSON, JSON wrapped in prose and truncated output, and returns normalized `Suggestion` objects.

## 3. Configure API Domain Access

If your provider requires a new API host, update:
- `apps/extension/public/manifest.json`
  - `host_permissions`
  - `content_security_policy.extension_pages` `connect-src`

## 4. Add Tests

Parsing is covered in `response-parsing.test.ts` (`pnpm -C packages/providers test`). Add cases there for any new response shape your provider returns.
