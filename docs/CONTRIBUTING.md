# Contributing to plenz

Thanks for your interest in improving plenz.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:
   - `pnpm install`
3. Run the extension:
   - `pnpm --filter extension dev`

For full setup instructions, see `DEVELOPMENT.md`.

## Branching and Commits

- Branch naming:
  - `feat/...`
  - `fix/...`
  - `docs/...`
  - `refactor/...`
  - `chore/...`
- Use Conventional Commits:
  - `feat: ...`
  - `fix: ...`
  - `docs: ...`

## Pull Requests

- Keep PRs focused and small.
- Link the related issue.
- Include screenshots for UI changes.
- Run checks before opening a PR:
  - `pnpm type-check`
  - `pnpm test:unit` (core, providers and extension unit tests)
  - `pnpm build:chrome`, then `pnpm -C apps/extension e2e` (the built extension in Chromium on fixture pages; run `pnpm -C apps/extension exec playwright install chromium` once first)

## Live site smoke test

`pnpm -C apps/extension e2e:live` opens the real ChatGPT, Claude, Gemini and Perplexity pages with the built extension and checks that each adapter still finds the composer. It also runs daily in CI (`.github/workflows/live-smoke.yml`). Sites that show a bot check or sign-in form to a fresh browser are skipped, not failed. A failure usually means a site changed its markup: update the selectors in `apps/extension/src/content/editors/platforms.ts` and the matching fixture.

## Code Style

- TypeScript with strict typing.
- Follow `.editorconfig`.
- Biome configuration is in `biome.json` (adoption in progress).

## Reporting Bugs

Use the issue templates in `.github/ISSUE_TEMPLATE`.

## Security Reports

Do not open public issues for vulnerabilities.
See `SECURITY.md` for disclosure instructions.

## Shared UI Convention

- All shadcn primitives must come from `@plenz/ui`.
- Use app-context commands when adding components:
  - `pnpm dlx shadcn@latest add <component> -c apps/web`
  - `pnpm dlx shadcn@latest add <component> -c apps/extension`
- Do not create or commit files under `apps/*/src/components/ui`.
- Run `pnpm lint:ui-primitives` before opening a PR.

