// Context cards: short notes the user saves once (about me, a project, a
// tone) and adds to a draft with one click from the refine picker. They live
// in chrome.storage.local on this device only; nothing reads them except the
// options page and the content script, and a card's text reaches a site or
// provider only when the user inserts it into a draft.

export type ContextCard = { id: string; title: string; text: string };

export const CONTEXT_CARDS_STORAGE_KEY = "contextCards";
export const MAX_CONTEXT_CARDS = 20;
export const MAX_CARD_TITLE_CHARS = 40;
export const MAX_CARD_TEXT_CHARS = 2000;

/** Whatever is in storage, as a list of usable cards (bad entries dropped). */
export function normalizeCards(value: unknown): ContextCard[] {
  if (!Array.isArray(value)) return [];
  const cards: ContextCard[] = [];
  const ids = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { id, title, text } = entry as Partial<ContextCard>;
    if (typeof id !== "string" || !id || ids.has(id)) continue;
    if (typeof title !== "string" || typeof text !== "string") continue;
    const card = {
      id,
      title: title.trim().slice(0, MAX_CARD_TITLE_CHARS),
      text: text.trim().slice(0, MAX_CARD_TEXT_CHARS),
    };
    if (!card.title || !card.text) continue;
    ids.add(id);
    cards.push(card);
    if (cards.length === MAX_CONTEXT_CARDS) break;
  }
  return cards;
}

/**
 * The draft with a card's text added above it, as its own paragraph. A card
 * already at the top of the draft isn't added twice.
 */
export function withCard(draft: string, cardText: string): string {
  const card = cardText.trim();
  const rest = draft.trim();
  if (!card || rest.startsWith(card)) return draft;
  return rest ? `${card}\n\n${rest}` : card;
}
