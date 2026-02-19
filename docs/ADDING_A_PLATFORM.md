# Adding a Supported Platform

## 1. Add `PlatformConfig`

Update `apps/extension/src/content/platforms/registry.ts` with:
- `name`
- `hostPatterns`
- `inputSelectors`
- `submitButtonSelectors`
- `containerSelector`
- `inputType`

## 2. Validate Input Semantics

Confirm whether the platform uses:
- `textarea`
- `contenteditable`
- ProseMirror-like editor

This affects suggestion application behavior.

## 3. Validate Overlay Placement

Ensure `SuggestionOverlay`, `GhostOverlay`, and `BadgeIndicator` render correctly with the new container/input selectors.

## 4. Add DOM Fixture and E2E Coverage

Add a fixture capturing the platform input DOM and include E2E checks for:
- input detection
- suggestions display
- suggestion apply/overwrite

## 5. Document Platform Support

Update `README.md` supported platforms table and status.
