import type { ChatMessage } from "@plenz/types";

/** How a write reached the editor, from most to least native. */
export type WriteMethod = "paste" | "insertText" | "direct";

/**
 * Everything the content script needs from a chat site's composer. Platform
 * adapters only differ in where things are; reading and writing go through
 * the shared, editor-native helpers in ./dom.ts.
 */
export interface EditorAdapter {
  /** Short platform id, e.g. "chatgpt"; also sent as chat context. */
  readonly name: string;
  matches(host: string): boolean;
  /** The composer the user types the prompt into, or null if not on the page yet. */
  findInput(doc: Document): HTMLElement | null;
  read(input: HTMLElement): string;
  /** Replace the whole draft through the editor's own input path where possible. */
  write(input: HTMLElement, text: string): WriteMethod;
  /** Visible chat messages, oldest first, excluding the composer itself. */
  readMessages(doc: Document, input: HTMLElement | null): ChatMessage[];
  /** Element the badge and refine panel position against. */
  anchorFor(input: HTMLElement): HTMLElement;
}
