import { isVisible, readText, writeText } from "./dom.ts";
import type { EditorAdapter } from "./types.ts";

/** Smallest box we treat as a prompt field (skips one-line inputs styled as textareas). */
const MIN_HEIGHT_PX = 32;

/** The focused element, following focus into open shadow roots. */
function deepActiveElement(doc: Document): Element | null {
  let active: Element | null = doc.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/** The outermost contenteditable element containing `element`, i.e. the editor root. */
function editableRoot(element: Element): HTMLElement | null {
  let root: HTMLElement | null = null;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const editable = node.getAttribute("contenteditable");
    if (editable === "" || editable === "true" || editable === "plaintext-only") {
      root = node as HTMLElement;
    } else if (editable === "false") {
      break;
    }
  }
  return root;
}

/**
 * A multi-line text box the user can type a prompt into: a textarea or a rich
 * editor. Single-line inputs (search, email, password) are never used.
 */
export function promptFieldFor(element: Element | null): HTMLElement | null {
  if (!element) return null;

  let field: HTMLElement | null = null;
  if (element.tagName === "TEXTAREA") {
    const textarea = element as HTMLTextAreaElement;
    if (!textarea.disabled && !textarea.readOnly) field = textarea;
  } else {
    field = editableRoot(element);
  }

  if (!field || !isVisible(field)) return null;
  // happy-dom and detached layouts report 0; only reject boxes we can measure.
  const height = field.getBoundingClientRect?.().height ?? 0;
  if (height > 0 && height < MIN_HEIGHT_PX && field.tagName !== "TEXTAREA") return null;
  return field;
}

/**
 * For sites the user enabled from the popup. There's no known composer, so the
 * prompt field is whichever multi-line text box the user focuses.
 */
export const genericAdapter: EditorAdapter = {
  name: "web",
  matches: () => true,
  findInput: (doc) => promptFieldFor(deepActiveElement(doc)),
  read: readText,
  write: writeText,
  // Arbitrary pages have no chat transcript to read.
  readMessages: () => [],
  anchorFor: (input) => input.parentElement ?? input,
};
