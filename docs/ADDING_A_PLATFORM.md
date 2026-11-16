# Adding a Supported Platform

Each chat site is an `EditorAdapter` (`apps/extension/src/content/editors/types.ts`): it finds the composer, reads and writes the draft, reads the chat messages, and says where the badge and panel attach.

## 1. Add the platform spec

Add an entry to `PLATFORMS` in `apps/extension/src/content/editors/platforms.ts`:
- `name`: short id, also sent as chat context
- `hosts`: matched exactly or as a parent domain (`openai.com` matches `chat.openai.com`, never `notopenai.com`)
- `inputSelectors`: tried in order; the first visible, editable match is the composer
- `messageSelectors`: each with a role (`user`, `assistant` or `unknown`)

Then add the site to `content_scripts.matches` in `apps/extension/public/manifest.json`.

## 2. Check how the editor takes text

Writes go through `writeText` in `editors/dom.ts`, from most to least native:
1. A synthetic paste, for rich editors (ProseMirror, Quill, Lexical) that handle paste as one undoable change
2. `execCommand("insertText")`, which keeps the browser's undo for textareas and plain contenteditables
3. Setting the DOM directly and firing `input`, as a last resort

If the site's editor needs something else, give its adapter its own `write`.

## 3. Add a fixture

Add the site to `FIXTURES` in `apps/extension/src/content/editors/editors.test.ts`: a minimal copy of its composer and message markup, the draft it contains, and the messages you expect. Run `pnpm -C apps/extension test`. When the site changes its DOM, update the fixture and selectors together.

## 4. Check placement

Load the extension and confirm the badge and refine panel sit correctly next to the new composer.

## 5. Document platform support

Update the supported platforms table in `README.md`.
