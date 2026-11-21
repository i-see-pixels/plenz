# plenz for Claude Code

The [plenz](https://plenz.siddsingh.dev) prompt coach as a Claude Code plugin.
Like Grammarly, but for the prompt you're about to send.

As you type, a row above the prompt box shows:

- **A free local check:** a score out of 100 and chips such as "No output
  format" or "No audience or tone", with one hint for the most important one.
  It is the extension's own rubric and runs on every keystroke with no model
  call.
- **AI refine on demand:** Improve, Tighten (shorter, same requirements),
  Structure (labeled sections) or Ask me (answer 2–3 questions, then get the
  prompt). The result shows as a word-level diff; press Replace to put it in
  the box, and Undo to get your draft back.

Refine runs on Haiku through your own Claude account, so there is no API key to
set up; it counts toward your usage like any other request. The check stays
quiet for drafts under three words and for `/`, `!` and `#` entries.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install plenz --marketplace i-see-pixels/plenz
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in
every session).

From a shell:

```
claude plugin install plenz --marketplace i-see-pixels/plenz
```

In the Claude desktop app, where `/plugin` does not run: click + next to the
prompt box, then Plugins, Add marketplace with `i-see-pixels/plenz`, then Add
plugin.

A `plenz.plugin` file is also attached to each
[GitHub release](https://github.com/i-see-pixels/plenz/releases) tagged
`claude-plugin-v*`.

The row draws in Claude Code: the terminal and the desktop app's Code tab. The
desktop app's Chat tab does not run plugins like this one; there, use the plenz
browser extension on claude.ai instead.

## Developing

The plugin's hooks can only import files inside this folder, so
`hooks/core/` holds copies of `packages/core/src/lint.ts`, `diff.ts` and
`refine.ts`. After changing those, run `node scripts/sync-claude-plugin.mjs`
from the repository root; the release workflow fails if the copies are out of
date.

Run the tests with `claude plugin test apps/claude-plugin`, and check the
plugin and the marketplace with `claude plugin validate .` from the root.

To release, bump `version` in `.claude-plugin/plugin.json` and push a tag such
as `claude-plugin-v0.2.0`.
