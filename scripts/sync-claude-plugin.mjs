// Copies the prompt check, word diff and refine prompts from packages/core into
// the Claude plugin. A plugin's hooks can only import files inside its own
// folder, so it carries copies; this keeps them the same as packages/core.
//
//   node scripts/sync-claude-plugin.mjs          write the copies
//   node scripts/sync-claude-plugin.mjs --check  exit 1 if a copy is out of date

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const from = "packages/core/src";
const to = "apps/claude-plugin/hooks/core";

function replaceOnce(text, search, replacement, file) {
  if (!text.includes(search)) {
    throw new Error(`${file}: expected to find ${JSON.stringify(search)}`);
  }
  return text.replace(search, replacement);
}

const files = {
  "lint.ts": (text) => text,
  // The plugin's type-check is stricter (noUncheckedIndexedAccess).
  "diff.ts": (text) =>
    `// @ts-nocheck: copied from packages/core/src/diff.ts by scripts/sync-claude-plugin.mjs.\n${text}`,
  "refine.ts": (text) => {
    let out = text.replace(/from "@plenz\/types";/, 'from "./types";');
    if (out === text)
      throw new Error('refine.ts: expected the "@plenz/types" import');
    out = replaceOnce(
      out,
      "output = fenced[1].trim()",
      "output = fenced[1]!.trim()",
      "refine.ts",
    );
    out = replaceOnce(
      out,
      "if (quoted && !quoted[1].includes('\"')) output = quoted[1].trim()",
      "if (quoted && !quoted[1]!.includes('\"')) output = quoted[1]!.trim()",
      "refine.ts",
    );
    return out;
  },
};

const check = process.argv.includes("--check");
let stale = 0;

for (const [name, transform] of Object.entries(files)) {
  const want = transform(readFileSync(join(from, name), "utf8"));
  const path = join(to, name);
  const have = readFileSync(path, "utf8");
  if (have === want) continue;
  if (check) {
    console.error(
      `${path} is out of date; run node scripts/sync-claude-plugin.mjs`,
    );
    stale++;
  } else {
    writeFileSync(path, want);
    console.log(`updated ${path}`);
  }
}

if (stale) process.exit(1);
