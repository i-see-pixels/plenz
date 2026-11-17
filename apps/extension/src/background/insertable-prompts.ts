import type { InsertablePrompt } from "../shared/rpc";
import { PromptGalleryManager } from "./prompt-gallery";

// Prompts offered by the in-page `/` command: the user's saved prompts (when
// signed in) and the public gallery's trending ones. Each `/` would otherwise
// cost Firestore reads, so the list is kept for a minute and dropped whenever
// saved prompts or the signed-in user change.

const TTL_MS = 60_000;
const MAX_GALLERY_PROMPTS = 24;

let cache: { at: number; prompts: Promise<InsertablePrompt[]> } | null = null;

/** Missing sign-in or Firebase config just means that source is empty. */
async function settle<T>(work: () => Promise<T[]>): Promise<T[]> {
  try {
    return await work();
  } catch {
    return [];
  }
}

async function load(): Promise<InsertablePrompt[]> {
  const [saved, gallery] = await Promise.all([
    settle(() => PromptGalleryManager.listSavedPrompts()),
    settle(() => PromptGalleryManager.listPublicPrompts("trending")),
  ]);
  return [
    ...saved.map((p) => ({ id: p.id, title: p.title, text: p.prompt, source: "saved" as const })),
    ...gallery
      .slice(0, MAX_GALLERY_PROMPTS)
      .map((p) => ({ id: p.id, title: p.title, text: p.prompt, source: "gallery" as const })),
  ];
}

export const InsertablePrompts = {
  list(now = Date.now()): Promise<InsertablePrompt[]> {
    if (!cache || now - cache.at > TTL_MS) {
      cache = { at: now, prompts: load() };
    }
    return cache.prompts;
  },

  invalidate() {
    cache = null;
  },
};
