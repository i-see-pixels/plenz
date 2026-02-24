# PromptLens - GitHub Repository Setup Checklist

> Project: PromptLens - Open-Source AI Prompt Refinement Browser Extension
> License: MIT
> Last updated: February 18, 2026
> Scope: Local repo + GitHub publishing readiness

## Legend

- [x] Done in this repository
- [ ] Pending (requires GitHub UI, org settings, store credentials, or release assets)
- [ ] Partially done

## 1. Repository Creation and Settings

- [ ] Create GitHub repository `i-see-pixels/promptlens` (or org of choice)
- [ ] Set repository visibility to Public
- [ ] Add repository description
- [ ] Add repository topics/tags
- [x] Set default branch target as `main` in docs/workflows
- [ ] Add homepage URL (landing page once live)
- [ ] Enable Issues and Discussions tabs
- [ ] Disable Wiki (docs/ is source of truth)
- [ ] Enable Sponsorships (optional)
- [ ] Upload social preview image (1280x640)

## 2. Branch Protection Rules

- [ ] Protect `main` branch
- [ ] Require pull request reviews (minimum 1)
- [ ] Require status checks (CI)
- [ ] Require branches to be up-to-date before merge
- [ ] Require signed commits (recommended)
- [ ] Restrict force pushes
- [ ] Restrict deletions
- [ ] Create `develop` branch (optional)
- [x] Branch naming convention documented via Conventional Commits and templates

## 3. Repository Files and Metadata

- [x] `README.md`
- [x] `LICENSE` (MIT)
- [x] `CHANGELOG.md`
- [x] `CODE_OF_CONDUCT.md`
- [x] `SECURITY.md`
- [x] `.gitignore`
- [x] `.editorconfig`
- [x] `biome.json`
- [x] `tsconfig.json`
- [x] Root `package.json`
- [x] `pnpm-lock.yaml`
- [x] Extension `vite.config.ts` at `apps/extension/vite.config.ts`
- [x] Extension manifests at `apps/extension/public/manifest.json` and `apps/extension/public/manifest.firefox.json`
- [x] `.env.example`

## 4. Project Structure

- [x] Monorepo structure present (`apps/`, `packages/`, `.github/`, `docs/`, `assets/`)
- [x] Extension entry points exist (`apps/extension/src/background/index.ts`, `apps/extension/src/content/index.ts`, `apps/extension/src/popup/main.tsx`, `apps/extension/src/options/main.tsx`)
- [x] Provider type contracts present in `packages/types/src/index.ts`

## 5. GitHub Actions Workflows

- [x] `ci.yml` (PR to `main`, install, lint, type-check, unit-test placeholder)
- [x] `e2e.yml` (push to `main`, build, placeholder E2E step)
- [x] `release-chrome.yml` trigger on tags `v*.*.*`
- [x] `release-firefox.yml` manual trigger
- [ ] Release workflows include build steps but publish steps are placeholders (partially done)

### Required GitHub Secrets

- [ ] `CHROME_EXTENSION_ID`
- [ ] `CHROME_CLIENT_ID`
- [ ] `CHROME_CLIENT_SECRET`
- [ ] `CHROME_REFRESH_TOKEN`
- [ ] `FIREFOX_API_KEY`
- [ ] `FIREFOX_API_SECRET`
- [ ] `SENTRY_DSN`

## 6. Issue and PR Templates

- [x] `.github/ISSUE_TEMPLATE/bug_report.md`
- [x] `.github/ISSUE_TEMPLATE/broken_platform.md`
- [x] `.github/ISSUE_TEMPLATE/feature_request.md`
- [x] `.github/PULL_REQUEST_TEMPLATE.md`
- [x] `.github/config.yml`

## 7. Labels Setup

- [ ] Create labels in GitHub UI/API (`bug`, `enhancement`, `good first issue`, `help wanted`, `platform-breakage`, etc.)

## 8. Documentation

- [x] `docs/CONTRIBUTING.md`
- [x] `docs/ARCHITECTURE.md`
- [x] `docs/ADDING_A_PROVIDER.md`
- [x] `docs/ADDING_A_PLATFORM.md`
- [x] `docs/SECURITY.md`
- [x] `DEVELOPMENT.md` (root)

## 9. Community and Governance

- [x] `.github/CODEOWNERS`
- [ ] GitHub Discussions enabled and categorized
- [ ] Community Discord (optional)
- [ ] CLA decision documented (optional for MIT)

## 10. README Completeness

- [x] Project logo/banner
- [x] One-line description and badges (License, CI, E2E, CodeQL)
- [ ] Demo GIF or screenshot of inline suggestions
- [ ] Installation section present, but store links are placeholders (partially done)
- [x] Quick start
- [x] Supported platforms section
- [x] Supported providers section
- [x] Privacy and security section
- [x] Contributing section
- [x] Development section
- [x] Roadmap section
- [x] License section
- [x] Acknowledgments section

## 11. GitHub Projects and Milestones

- [ ] Create milestones (Phase 1-4)
- [ ] Create GitHub Project board
- [ ] Seed with initial issues

## 12. Release Strategy

- [x] Semantic Versioning adopted (`0.1.0`)
- [ ] Create and push Git tags (`v0.1.0`, etc.)
- [ ] Configure GitHub Releases with changelog automation
- [ ] Attach `.crx` and `.xpi` artifacts to releases
- [x] Conventional Commits documented and in use

## 13. Security and Compliance

- [x] Dependabot configured (`.github/dependabot.yml`)
- [x] CodeQL workflow configured (`.github/workflows/codeql.yml`)
- [ ] Secret scanning enabled in GitHub Security settings
- [x] `.env.example` committed
- [x] Extension CSP policy present in manifest
- [x] Security docs present

## 14. Pre-Launch Verification

- [x] Type-check passes (`pnpm type-check`)
- [ ] CI status green on GitHub `main` (after first push)
- [ ] README links/images validated on GitHub rendered page
- [ ] `good first issue` labels applied to at least 5 issues
- [x] License file present
- [x] `.gitignore` covers artifacts and env files
- [ ] Repository publicly indexed by GitHub search
- [ ] Social preview image uploaded
- [ ] First release tag (`v0.1.0-alpha`) created and workflow tested
