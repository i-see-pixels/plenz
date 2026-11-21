import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  MAX_CARD_TEXT_CHARS,
  MAX_CONTEXT_CARDS,
  normalizeCards,
  withCard,
} from "./context-cards.ts";

describe("normalizeCards", () => {
  test("keeps valid cards in order, trimmed", () => {
    assert.deepEqual(
      normalizeCards([
        { id: "a", title: " About me ", text: " I'm a backend engineer. " },
        { id: "b", title: "Tone", text: "Plain and direct." },
      ]),
      [
        { id: "a", title: "About me", text: "I'm a backend engineer." },
        { id: "b", title: "Tone", text: "Plain and direct." },
      ],
    );
  });

  test("drops malformed, empty and duplicate entries", () => {
    assert.deepEqual(
      normalizeCards([
        null,
        "card",
        { id: "a", title: "Empty", text: "   " },
        { id: "", title: "No id", text: "x" },
        { id: "b", title: 3, text: "x" },
        { id: "c", title: "Kept", text: "x" },
        { id: "c", title: "Duplicate", text: "y" },
      ]),
      [{ id: "c", title: "Kept", text: "x" }],
    );
    assert.deepEqual(normalizeCards(undefined), []);
    assert.deepEqual(normalizeCards({ id: "a" }), []);
  });

  test("caps the number and length of cards", () => {
    const many = Array.from({ length: MAX_CONTEXT_CARDS + 5 }, (_, i) => ({
      id: String(i),
      title: "t",
      text: "x".repeat(MAX_CARD_TEXT_CHARS + 10),
    }));
    const cards = normalizeCards(many);
    assert.equal(cards.length, MAX_CONTEXT_CARDS);
    assert.equal(cards[0].text.length, MAX_CARD_TEXT_CHARS);
  });
});

describe("withCard", () => {
  test("adds the card as its own paragraph above the draft", () => {
    assert.equal(
      withCard(
        "write a launch email\n",
        "I work at a small analytics startup.",
      ),
      "I work at a small analytics startup.\n\nwrite a launch email",
    );
  });

  test("an empty draft becomes just the card", () => {
    assert.equal(withCard("  ", " Be concise. "), "Be concise.");
  });

  test("a card already at the top isn't added twice", () => {
    const draft = "Be concise.\n\nwrite a launch email";
    assert.equal(withCard(draft, "Be concise."), draft);
  });
});
