// The `/` command: type `/` at the start of the draft's last line to search
// your context cards and saved or gallery prompts, then insert one. Pure
// helpers here; the driver owns the menu and the keys.
//
// Only the draft's text is visible to us (not the caret), so the command is
// the last line while it is still being typed: `/` followed by a short query.
// Trailing newlines are ignored; rich editors' innerText often adds one.

export type SlashSource = "card" | "saved" | "gallery";

export type SlashItem = {
  id: string;
  title: string;
  text: string;
  source: SlashSource;
};

export const MAX_SLASH_QUERY_CHARS = 30;
export const MAX_SLASH_RESULTS = 8;

const COMMAND = new RegExp(
  `(^|\\n)/([^\\n/]{0,${MAX_SLASH_QUERY_CHARS}})\\n*$`,
);

/** The query after a trailing `/`, or null when the draft doesn't end in a command. */
export function parseSlashQuery(draft: string): string | null {
  const match = COMMAND.exec(draft);
  if (!match) return null;
  const query = match[2];
  // "/ something" reads as prose, not a command.
  return /^\s/.test(query) ? null : query;
}

/** The draft with its trailing `/query` line replaced by `text`. */
export function replaceSlashCommand(draft: string, text: string): string {
  const match = COMMAND.exec(draft);
  if (!match) return draft;
  const before = draft.slice(0, match.index + match[1].length);
  return `${before}${text.trim()}`;
}

function rank(item: SlashItem, query: string): number {
  const title = item.title.toLowerCase();
  if (title.startsWith(query)) return 0;
  if (title.split(/[\s\-_/]+/).some((word) => word.startsWith(query))) return 1;
  if (title.includes(query)) return 2;
  if (item.text.toLowerCase().includes(query)) return 3;
  return -1;
}

/**
 * Items matching the query, best first; ties keep the given order (cards,
 * then saved, then gallery). An empty query lists everything.
 */
export function matchSlashItems(
  items: SlashItem[],
  query: string,
): SlashItem[] {
  const needle = query.trim().toLowerCase();
  const seen = new Set<string>();
  const ranked: Array<{ item: SlashItem; score: number; index: number }> = [];
  items.forEach((item, index) => {
    // The same prompt saved from the gallery shows once.
    const key = item.text.trim();
    if (seen.has(key)) return;
    const score = needle ? rank(item, needle) : 0;
    if (score < 0) return;
    seen.add(key);
    ranked.push({ item, score, index });
  });
  return ranked
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, MAX_SLASH_RESULTS)
    .map(({ item }) => item);
}
