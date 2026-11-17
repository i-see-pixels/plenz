import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Window } from "happy-dom";
import { readText, sameText, writeText } from "./dom.ts";
import { genericAdapter, promptFieldFor } from "./generic.ts";
import { findPlatformAdapter, hostMatches } from "./platforms.ts";

/** A fresh page at `url` with `html` in the body. */
function page(url: string, html: string) {
  const window = new Window({ url });
  window.document.body.innerHTML = html;
  return window.document as unknown as Document;
}

// Minimal copies of each site's composer and message markup, matching the
// selectors the adapters rely on. When a site changes its DOM, update these.
const FIXTURES = {
  chatgpt: {
    url: "https://chatgpt.com/c/123",
    html: `
      <main>
        <div data-message-author-role="user"><div>How do I center a div?</div></div>
        <div data-message-author-role="assistant"><p>Use flexbox.</p></div>
      </main>
      <form><div id="prompt-textarea" contenteditable="true" class="ProseMirror"><p>chatgpt draft</p></div></form>`,
    messages: [
      { role: "user", text: "How do I center a div?" },
      { role: "assistant", text: "Use flexbox." },
    ],
    draft: "chatgpt draft",
  },
  claude: {
    url: "https://claude.ai/chat/abc",
    html: `
      <div data-testid="user-message">Summarize this paper</div>
      <div class="font-claude-message">Here is a summary</div>
      <fieldset><div contenteditable="true" class="ProseMirror"><p>claude draft</p></div></fieldset>`,
    messages: [
      { role: "user", text: "Summarize this paper" },
      { role: "assistant", text: "Here is a summary" },
    ],
    draft: "claude draft",
  },
  gemini: {
    url: "https://gemini.google.com/app",
    html: `
      <div class="user-query-container">Plan a trip to Lisbon</div>
      <message-content>Sure, here is a plan</message-content>
      <div class="input-area"><rich-textarea><div class="ql-editor" contenteditable="true"><p>gemini draft</p></div></rich-textarea></div>`,
    messages: [
      { role: "user", text: "Plan a trip to Lisbon" },
      { role: "assistant", text: "Sure, here is a plan" },
    ],
    draft: "gemini draft",
  },
  perplexity: {
    url: "https://www.perplexity.ai/search/x",
    html: `
      <main>
        <div data-testid="user-message">What is RAG?</div>
        <div data-testid="answer">Retrieval-augmented generation</div>
      </main>
      <div role="textbox" contenteditable="true" data-lexical-editor="true"><p>perplexity draft</p></div>`,
    messages: [
      { role: "user", text: "What is RAG?" },
      { role: "assistant", text: "Retrieval-augmented generation" },
    ],
    draft: "perplexity draft",
  },
} as const;

describe("platform matching", () => {
  test("each site maps to its adapter, including subdomains", () => {
    assert.equal(findPlatformAdapter("chatgpt.com")?.name, "chatgpt");
    assert.equal(findPlatformAdapter("chat.openai.com")?.name, "chatgpt");
    assert.equal(findPlatformAdapter("claude.ai")?.name, "claude");
    assert.equal(findPlatformAdapter("gemini.google.com")?.name, "gemini");
    assert.equal(findPlatformAdapter("www.perplexity.ai")?.name, "perplexity");
  });

  test("lookalike hosts don't match", () => {
    assert.equal(findPlatformAdapter("claude.ai.example.com"), null);
    assert.equal(findPlatformAdapter("notchatgpt.com"), null);
    assert.equal(hostMatches("evilperplexity.ai", "perplexity.ai"), false);
  });
});

for (const [name, fixture] of Object.entries(FIXTURES)) {
  describe(`${name} adapter`, () => {
    const adapter = findPlatformAdapter(new URL(fixture.url).hostname)!;

    test("finds the composer and reads the draft", () => {
      const doc = page(fixture.url, fixture.html);
      const input = adapter.findInput(doc);
      assert.ok(input, "composer not found");
      assert.equal(adapter.read(input).trim(), fixture.draft);
    });

    test("reads chat messages oldest first, without the composer", () => {
      const doc = page(fixture.url, fixture.html);
      const input = adapter.findInput(doc);
      const messages = adapter.readMessages(doc, input).map(({ role, text }) => ({ role, text }));
      assert.deepEqual(messages, fixture.messages);
    });
  });
}

describe("finding the composer", () => {
  test("Perplexity's older textarea composer still works", () => {
    const doc = page("https://www.perplexity.ai/", `<textarea placeholder="Ask anything...">older</textarea>`);
    assert.equal(readText(findPlatformAdapter("www.perplexity.ai")!.findInput(doc)!), "older");
  });

  test("skips disabled and read-only fields", () => {
    const doc = page(
      "https://www.perplexity.ai/",
      `<textarea placeholder="Ask" disabled>old</textarea>
       <textarea class="overflow-auto">live</textarea>`,
    );
    assert.equal(readText(findPlatformAdapter("www.perplexity.ai")!.findInput(doc)!), "live");
  });

  test("skips editors that are not contenteditable", () => {
    const doc = page(
      "https://claude.ai/",
      `<fieldset><div class="ProseMirror" contenteditable="false">preview</div></fieldset>
       <fieldset><div class="ProseMirror" contenteditable="true">live</div></fieldset>`,
    );
    assert.equal(findPlatformAdapter("claude.ai")!.findInput(doc)?.textContent, "live");
  });

  test("skips hidden composers left behind by the page", () => {
    const doc = page(
      "https://claude.ai/",
      `<div class="ProseMirror" contenteditable="true" style="display:none">stale</div>
       <fieldset><div class="ProseMirror" contenteditable="true">live</div></fieldset>`,
    );
    assert.equal(findPlatformAdapter("claude.ai")!.findInput(doc)?.textContent, "live");
  });

  test("hidden messages are left out of the chat context", () => {
    const doc = page(
      "https://claude.ai/",
      `<div data-testid="user-message" style="display:none">draft from another tab</div>
       <div data-testid="user-message">visible question</div>`,
    );
    assert.deepEqual(
      findPlatformAdapter("claude.ai")!.readMessages(doc, null).map((m) => m.text),
      ["visible question"],
    );
  });

  test("returns null until the composer exists", () => {
    const doc = page("https://claude.ai/", "<main>loading</main>");
    assert.equal(findPlatformAdapter("claude.ai")!.findInput(doc), null);
  });
});

/**
 * Like ProseMirror and Lexical: the editor keeps its own copy of the selection,
 * synced from the DOM when selectionchange is delivered (a later task in
 * Chrome), and applies a paste to that copy, not to the DOM selection.
 */
function modelEditor(doc: Document, draft: string) {
  doc.body.innerHTML = `<div id="ed" contenteditable="true"><p>${draft}</p></div>`;
  const editor = doc.getElementById("ed")!;
  const win = doc.defaultView!;
  const state = { text: draft, allSelected: false, pastes: 0 };
  doc.addEventListener("selectionchange", () => {
    const selection = win.getSelection();
    const covers = !!selection && !selection.isCollapsed && selection.toString().trim() === state.text;
    win.setTimeout(() => (state.allSelected = covers), 0);
  });
  editor.addEventListener("paste", (event) => {
    const data = (event as ClipboardEvent).clipboardData?.getData("text/plain") ?? "";
    event.preventDefault();
    state.pastes++;
    // Replace what the editor thinks is selected; otherwise insert at the caret (the end).
    state.text = state.allSelected ? data : state.text + data;
    editor.innerHTML = `<p>${state.text}</p>`;
  });
  return { editor, state };
}

describe("writing the draft", () => {
  test("an editor that syncs its selection later still gets the whole draft replaced", async () => {
    const { editor, state } = modelEditor(page("https://claude.ai/", ""), "old draft");

    assert.equal(await writeText(editor, "new prompt"), "paste");
    assert.equal(state.pastes, 1);
    assert.equal(readText(editor).trim(), "new prompt");
  });

  test("an editor that takes the paste but doesn't show it (e.g. as an attachment) still gets the text", async () => {
    const doc = page("https://chatgpt.com/", `<div id="ed" contenteditable="true"><p>old draft</p></div>`);
    const editor = doc.getElementById("ed")!;
    editor.addEventListener("paste", (event) => {
      event.preventDefault();
      editor.innerHTML = "<p></p>";
    });

    await writeText(editor, "a long refined prompt");
    assert.ok(sameText(readText(editor), "a long refined prompt"), readText(editor));
  });

  test("an editor that applies the paste a moment later isn't written twice", async () => {
    const doc = page("https://claude.ai/", `<div id="ed" contenteditable="true"><p>old draft</p></div>`);
    const editor = doc.getElementById("ed")!;
    let pastes = 0;
    editor.addEventListener("paste", (event) => {
      const data = (event as ClipboardEvent).clipboardData?.getData("text/plain") ?? "";
      event.preventDefault();
      pastes++;
      // Lexical commits its update in a microtask.
      queueMicrotask(() => (editor.innerHTML = `<p>${data}</p>`));
    });

    assert.equal(await writeText(editor, "new prompt"), "paste");
    assert.equal(pastes, 1);
    assert.equal(readText(editor).trim(), "new prompt");
  });

  test("a rich editor that handles paste gets the text as one paste", async () => {
    const doc = page("https://claude.ai/", `<div id="ed" contenteditable="true"><p>old draft</p></div>`);
    const editor = doc.getElementById("ed")!;
    let pastes = 0;
    let inputs = 0;
    // Like ProseMirror: claim the paste and update its own document.
    editor.addEventListener("paste", (event) => {
      const data = (event as ClipboardEvent).clipboardData?.getData("text/plain") ?? "";
      event.preventDefault();
      pastes++;
      editor.innerHTML = `<p>${data}</p>`;
    });
    editor.addEventListener("input", () => inputs++);

    assert.equal(await writeText(editor, "new prompt"), "paste");
    assert.equal(pastes, 1);
    assert.equal(readText(editor).trim(), "new prompt");
    assert.equal(inputs, 0, "no extra synthetic input event when the editor handled it");
  });

  test("a plain contenteditable falls back and still fires input", async () => {
    const doc = page("https://claude.ai/", `<div id="ed" contenteditable="true">old draft</div>`);
    const editor = doc.getElementById("ed")!;
    let inputs = 0;
    editor.addEventListener("input", () => inputs++);

    const method = await writeText(editor, "new prompt");
    assert.ok(method === "insertText" || method === "direct", method);
    assert.ok(sameText(readText(editor), "new prompt"));
    assert.ok(inputs >= 1);
  });

  test("a textarea gets the full text and an input event", async () => {
    const doc = page("https://www.perplexity.ai/", `<textarea id="ta">old draft</textarea>`);
    const textarea = doc.getElementById("ta") as HTMLTextAreaElement;
    let inputs = 0;
    textarea.addEventListener("input", () => inputs++);

    const method = await writeText(textarea, "line one\nline two");
    assert.ok(method === "insertText" || method === "direct", method);
    assert.equal(textarea.value, "line one\nline two");
    assert.ok(inputs >= 1);
  });
});

describe("generic adapter (sites the user turned on)", () => {
  const focused = (html: string, id: string) => {
    const doc = page("https://notes.example.com/", html);
    (doc.getElementById(id) as HTMLElement).focus();
    return doc;
  };

  test("uses the textarea the user focuses", () => {
    const doc = focused(`<textarea id="a">first</textarea><textarea id="b">second</textarea>`, "b");
    assert.equal(readText(genericAdapter.findInput(doc)!), "second");
  });

  test("uses the root of a rich editor when focus is inside it", () => {
    const doc = focused(
      `<div id="editor" contenteditable="true"><p id="inner" tabindex="0">draft</p></div>`,
      "inner",
    );
    assert.equal(genericAdapter.findInput(doc)?.id, "editor");
  });

  test("follows focus into open shadow roots", () => {
    const doc = page("https://app.example.com/", `<div id="host"></div>`);
    const shadow = doc.getElementById("host")!.attachShadow({ mode: "open" });
    shadow.innerHTML = `<textarea id="inside">in shadow</textarea>`;
    (shadow.getElementById("inside") as HTMLElement).focus();
    assert.equal(readText(genericAdapter.findInput(doc)!), "in shadow");
  });

  test("never uses one-line, password or disabled fields", () => {
    for (const html of [
      `<input id="f" type="text" value="search">`,
      `<input id="f" type="password" value="secret">`,
      `<textarea id="f" disabled>locked</textarea>`,
      `<textarea id="f" readonly>locked</textarea>`,
      `<button id="f">Send</button>`,
    ]) {
      assert.equal(genericAdapter.findInput(focused(html, "f")), null, html);
    }
  });

  test("nothing focused means no field, and there are no chat messages to read", () => {
    const doc = page("https://notes.example.com/", `<textarea>idle</textarea>`);
    assert.equal(genericAdapter.findInput(doc), null);
    assert.deepEqual(genericAdapter.readMessages(doc, null), []);
    assert.equal(promptFieldFor(null), null);
  });
});

describe("sameText", () => {
  test("ignores layout whitespace and non-breaking spaces", () => {
    assert.equal(sameText("a b\n\nc ", " a b c"), true);
    assert.equal(sameText("a b", "a c"), false);
  });
});
