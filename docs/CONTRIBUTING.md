# Contributing to PromptLens

Thanks for your interest in improving PromptLens.

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
  - `pnpm test:unit`

## Code Style

- TypeScript with strict typing.
- Follow `.editorconfig`.
- Biome configuration is in `biome.json` (adoption in progress).

## Reporting Bugs

Use the issue templates in `.github/ISSUE_TEMPLATE`.

## Security Reports

Do not open public issues for vulnerabilities.
See `SECURITY.md` for disclosure instructions.
