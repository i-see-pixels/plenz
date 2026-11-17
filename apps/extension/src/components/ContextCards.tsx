import { useEffect, useRef, useState } from "preact/hooks";
import { Badge } from "@plenz/ui/components/badge";
import { Button } from "@plenz/ui/components/button";
import { Input } from "@plenz/ui/components/input";
import {
  CONTEXT_CARDS_STORAGE_KEY,
  MAX_CARD_TEXT_CHARS,
  MAX_CARD_TITLE_CHARS,
  MAX_CONTEXT_CARDS,
  normalizeCards,
  type ContextCard,
} from "../shared/context-cards";

type Status = { kind: "idle" | "saving" | "saved" } | { kind: "error"; message: string };

/** How long after the last keystroke the cards save. */
const SAVE_DELAY_MS = 500;

/**
 * Edit the context cards offered in the refine picker. Saved on this device
 * only (chrome.storage.local) as you edit; cards with no text aren't saved.
 */
export function ContextCards() {
  const [cards, setCards] = useState<ContextCard[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    void chrome.storage.local
      .get(CONTEXT_CARDS_STORAGE_KEY)
      .then((stored) => setCards(normalizeCards(stored[CONTEXT_CARDS_STORAGE_KEY])));
  }, []);

  const edit = (next: ContextCard[]) => {
    setCards(next);
    setStatus({ kind: "saving" });
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      void save(next);
    }, SAVE_DELAY_MS);
  };
  const update = (id: string, patch: Partial<ContextCard>) =>
    edit(cards.map((card) => (card.id === id ? { ...card, ...patch } : card)));

  // The list on screen keeps half-written cards; only finished ones are saved.
  const save = async (cards: ContextCard[]) => {
    try {
      // An untitled card is named after its first words rather than dropped.
      const kept = normalizeCards(
        cards.map((card) => ({
          ...card,
          title: card.title.trim() || card.text.trim().slice(0, MAX_CARD_TITLE_CHARS),
        })),
      );
      await chrome.storage.local.set({ [CONTEXT_CARDS_STORAGE_KEY]: kept });
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  };

  return (
    <div className="grid gap-3 px-3 py-3">
      {cards.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No cards yet. Add one for things you keep retyping: who you are, the project
          you're working on, the tone you like.
        </p>
      )}
      {cards.map((card) => (
        <div key={card.id} className="grid gap-2 rounded-sm border border-border px-3 py-3">
          <div className="flex items-center gap-2">
            <Input
              aria-label="Card title"
              placeholder="Title, e.g. About me"
              maxLength={MAX_CARD_TITLE_CHARS}
              value={card.title}
              onInput={(event) =>
                update(card.id, { title: (event.target as HTMLInputElement).value })
              }
            />
            <Button
              variant="outline"
              onClick={() => edit(cards.filter((entry) => entry.id !== card.id))}
            >
              Delete
            </Button>
          </div>
          <textarea
            aria-label="Card text"
            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            placeholder="I'm a backend engineer at a small fintech. Prefer concise answers with code."
            maxLength={MAX_CARD_TEXT_CHARS}
            value={card.text}
            onInput={(event) =>
              update(card.id, { text: (event.target as HTMLTextAreaElement).value })
            }
          />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={cards.length >= MAX_CONTEXT_CARDS}
          onClick={() => edit([...cards, { id: crypto.randomUUID(), title: "", text: "" }])}
        >
          Add card
        </Button>
        <Badge variant="outline" role="status">
          {status.kind === "saving"
            ? "Saving…"
            : status.kind === "saved"
              ? "Saved"
              : status.kind === "error"
                ? "Error"
                : "This device"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {status.kind === "error"
          ? status.message
          : "Cards appear under \"Add context\" in the refine panel, and when you type / in a chat box. A card goes into your draft only when you click it, and stays on this device otherwise."}
      </p>
    </div>
  );
}
