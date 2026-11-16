// Reading and writing chat composers the way a user would, so the page's
// editor (ProseMirror, Quill, Lexical, a React textarea) keeps its own model
// and undo history. Uses the element's own document and window rather than
// globals, so it works in iframes and in tests.

import type { WriteMethod } from "./types.ts";

type TextField = HTMLTextAreaElement | HTMLInputElement;

export function isTextField(element: Element): element is TextField {
  return element.tagName === "TEXTAREA" || element.tagName === "INPUT";
}

export function readText(input: HTMLElement): string {
  if (isTextField(input)) return input.value;
  return input.innerText ?? input.textContent ?? "";
}

/** Compare drafts ignoring how editors lay out whitespace and line breaks. */
export function sameText(a: string, b: string) {
  const normalize = (s: string) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
  return normalize(a) === normalize(b);
}

function selectAll(input: HTMLElement) {
  const doc = input.ownerDocument;
  input.focus();
  if (isTextField(input)) {
    input.setSelectionRange(0, input.value.length);
    return;
  }
  const selection = doc.defaultView?.getSelection();
  if (!selection) return;
  const range = doc.createRange();
  range.selectNodeContents(input);
  selection.removeAllRanges();
  selection.addRange(range);
}

function execInsertText(input: HTMLElement, text: string) {
  const doc = input.ownerDocument as Document & {
    execCommand?: (command: string, showUi?: boolean, value?: string) => boolean;
  };
  try {
    return typeof doc.execCommand === "function" && doc.execCommand("insertText", false, text);
  } catch {
    return false;
  }
}

/**
 * Rich editors handle paste as one transaction (so Ctrl+Z undoes it).
 * Returns true only if the editor claimed the event.
 */
function dispatchPaste(input: HTMLElement, text: string) {
  const win = input.ownerDocument.defaultView as (Window & typeof globalThis) | null;
  if (!win?.DataTransfer || !win.ClipboardEvent) return false;
  try {
    const data = new win.DataTransfer();
    data.setData("text/plain", text);
    const event = new win.ClipboardEvent("paste", {
      clipboardData: data,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    return event.defaultPrevented;
  } catch {
    return false;
  }
}

/** Last resort: set the DOM directly and tell the page something changed. */
function writeDirect(input: HTMLElement, text: string) {
  const win = input.ownerDocument.defaultView as (Window & typeof globalThis) | null;
  if (isTextField(input)) {
    // React tracks the value through the prototype setter, not the instance.
    const proto = Object.getPrototypeOf(input);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(input, text);
    else input.value = text;
  } else {
    input.textContent = text;
  }
  const InputEventCtor = win?.InputEvent ?? win?.Event;
  if (InputEventCtor) {
    input.dispatchEvent(
      new InputEventCtor("input", { bubbles: true, inputType: "insertText", data: text } as InputEventInit),
    );
  }
}

/** Replace the whole draft, preferring paths that keep the editor's undo. */
export function writeText(input: HTMLElement, text: string): WriteMethod {
  if (isTextField(input)) {
    selectAll(input);
    if (execInsertText(input, text) && input.value === text) return "insertText";
    writeDirect(input, text);
    return "direct";
  }

  selectAll(input);
  // If the editor claimed the paste it may apply it asynchronously, so trust it.
  if (dispatchPaste(input, text)) return "paste";

  selectAll(input);
  if (execInsertText(input, text) && sameText(readText(input), text)) return "insertText";

  writeDirect(input, text);
  return "direct";
}

export function isVisible(element: Element) {
  const check = (element as Element & { checkVisibility?: () => boolean }).checkVisibility;
  return typeof check === "function" ? check.call(element) : true;
}
