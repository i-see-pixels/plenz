import type { ChatMessage } from "@plenz/types";
import { isTextField, isVisible, readText, writeText } from "./dom.ts";
import type { EditorAdapter } from "./types.ts";

type PlatformSpec = {
  name: string;
  /** Matched exactly or as a parent domain (chat.openai.com matches openai.com). */
  hosts: string[];
  /** Tried in order; the first visible, editable match wins. */
  inputSelectors: string[];
  messageSelectors: Array<{ selector: string; role: ChatMessage["role"] }>;
  // Not used yet; kept for a future "review before send" step.
  submitButtonSelectors: string[];
  containerSelector: string;
};

const PLATFORMS: PlatformSpec[] = [
  {
    name: "chatgpt",
    hosts: ["chatgpt.com", "chat.openai.com"],
    inputSelectors: ["#prompt-textarea", '[data-id="root"] textarea'],
    messageSelectors: [
      { selector: '[data-message-author-role="user"]', role: "user" },
      { selector: '[data-message-author-role="assistant"]', role: "assistant" },
    ],
    submitButtonSelectors: ['[data-testid="send-button"]'],
    containerSelector: "form",
  },
  {
    name: "claude",
    hosts: ["claude.ai"],
    inputSelectors: ['[contenteditable="true"].ProseMirror', "fieldset .ProseMirror"],
    messageSelectors: [
      { selector: '[data-testid="user-message"]', role: "user" },
      { selector: '[data-testid="assistant-message"]', role: "assistant" },
      { selector: ".font-claude-message", role: "assistant" },
    ],
    submitButtonSelectors: ['button[aria-label="Send Message"]'],
    containerSelector: "fieldset",
  },
  {
    name: "gemini",
    hosts: ["gemini.google.com"],
    inputSelectors: ["rich-textarea .ql-editor", ".text-input-field textarea"],
    messageSelectors: [
      { selector: ".user-query-container", role: "user" },
      { selector: ".model-response-text", role: "assistant" },
      { selector: "message-content", role: "assistant" },
    ],
    submitButtonSelectors: ["button.send-button", '[aria-label="Send message"]'],
    containerSelector: ".input-area",
  },
  {
    name: "perplexity",
    hosts: ["perplexity.ai"],
    inputSelectors: ['textarea[placeholder*="Ask"]', "textarea.overflow-auto"],
    messageSelectors: [
      { selector: '[data-testid="user-message"]', role: "user" },
      { selector: '[data-testid="answer"]', role: "assistant" },
      { selector: "main article", role: "unknown" },
    ],
    submitButtonSelectors: ['button[aria-label="Submit"]'],
    containerSelector: "form",
  },
];

export function hostMatches(host: string, pattern: string) {
  return host === pattern || host.endsWith(`.${pattern}`);
}

export function isEditable(element: Element): element is HTMLElement {
  if (isTextField(element)) return !element.disabled && !element.readOnly;
  const editable = element.getAttribute("contenteditable");
  return editable === "" || editable === "true" || editable === "plaintext-only";
}

/** Visible message text, oldest first; the composer and anything inside it are skipped. */
export function collectMessages(
  doc: Document,
  selectors: PlatformSpec["messageSelectors"],
  input: HTMLElement | null,
): ChatMessage[] {
  const seen = new Set<Element>();
  const entries: Array<{ element: Element; message: ChatMessage }> = [];

  for (const { selector, role } of selectors) {
    for (const element of Array.from(doc.querySelectorAll(selector))) {
      if (seen.has(element)) continue;
      seen.add(element);
      if (input && (element === input || element.contains(input) || input.contains(element))) {
        continue;
      }
      if (!isVisible(element)) continue;
      const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text) entries.push({ element, message: { role, text, timestamp: Date.now() } });
    }
  }

  return entries
    .sort((a, b) =>
      a.element.compareDocumentPosition(b.element) & 2 /* b precedes a */ ? 1 : -1,
    )
    .map((entry) => entry.message);
}

function platformAdapter(spec: PlatformSpec): EditorAdapter {
  return {
    name: spec.name,
    matches: (host) => spec.hosts.some((pattern) => hostMatches(host, pattern)),
    findInput(doc) {
      for (const selector of spec.inputSelectors) {
        for (const element of Array.from(doc.querySelectorAll(selector))) {
          if (isEditable(element) && isVisible(element)) return element;
        }
      }
      return null;
    },
    read: readText,
    write: writeText,
    readMessages: (doc, input) => collectMessages(doc, spec.messageSelectors, input),
    anchorFor: (input) => input.parentElement ?? input,
  };
}

export const PLATFORM_ADAPTERS: EditorAdapter[] = PLATFORMS.map(platformAdapter);

export function findPlatformAdapter(host: string): EditorAdapter | null {
  return PLATFORM_ADAPTERS.find((adapter) => adapter.matches(host)) ?? null;
}
