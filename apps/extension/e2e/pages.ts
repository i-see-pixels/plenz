import type { BrowserContext, Page, Worker } from "@playwright/test";

/**
 * Minimal stand-ins for each chat site's composer, served at the real host so
 * the extension's content script injects exactly as it does in production.
 * Each exercises a different write path.
 */
const SHELL = (body: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>fixture</title>
<style>body{font:16px sans-serif;padding:200px 40px 40px} [contenteditable],textarea{display:block;width:600px;min-height:80px;border:1px solid #888;padding:8px}</style>
</head><body>${body}</body></html>`;

export const FIXTURES = {
  /** Plain contenteditable: no paste handler, so writes use execCommand("insertText"). */
  chatgpt: {
    url: "https://chatgpt.com/",
    composer: "#prompt-textarea",
    html: SHELL(`<form><div id="prompt-textarea" contenteditable="true"></div></form>`),
  },
  /**
   * A rich editor that, like ProseMirror and Lexical, keeps its own copy of the
   * selection (synced when the async selectionchange arrives) and applies a
   * paste to that copy. Counts pastes.
   */
  claude: {
    url: "https://claude.ai/new",
    composer: ".ProseMirror",
    html: SHELL(`<fieldset><div class="ProseMirror" contenteditable="true"></div></fieldset>
<script>
  window.__pastes = 0;
  const editor = document.querySelector(".ProseMirror");
  let allSelected = false;
  document.addEventListener("selectionchange", () => {
    const selection = getSelection();
    allSelected = !selection.isCollapsed && selection.toString().trim() === editor.innerText.trim();
  });
  editor.addEventListener("paste", (event) => {
    event.preventDefault();
    window.__pastes++;
    const text = event.clipboardData.getData("text/plain");
    const html = text.split("\\n").map((line) => "<p>" + (line || "<br>") + "</p>").join("");
    if (allSelected) editor.innerHTML = html;
    else editor.insertAdjacentHTML("beforeend", html);
  });
</script>`),
  },
  /** A textarea: writes use insertText, which keeps the browser's undo. */
  perplexity: {
    url: "https://www.perplexity.ai/",
    composer: "textarea",
    html: SHELL(`<form><textarea placeholder="Ask anything..."></textarea></form>`),
  },
} as const;

export type FixtureName = keyof typeof FIXTURES;

/** Point the extension at the mock provider, as if the user saved a Custom provider. */
export async function useMockProvider(serviceWorker: Worker, baseUrl: string) {
  await serviceWorker.evaluate(async (url) => {
    await chrome.storage.local.set({
      model_config_custom: { apiKey: "test-key", model: "mock-model", baseUrl: url },
    });
    await chrome.storage.sync.set({
      preferences: { activeProviderId: "custom", activeModelId: "mock-model" },
    });
  }, baseUrl);
}

export async function openFixture(context: BrowserContext, name: FixtureName): Promise<Page> {
  const fixture = FIXTURES[name];
  const origin = new URL(fixture.url).origin;
  await context.route(`${origin}/**`, (route) =>
    route.fulfill({ contentType: "text/html", body: fixture.html }),
  );
  const page = await context.newPage();
  await page.goto(fixture.url);
  return page;
}

/** The composer's current text, however the editor stores it. */
export function composerText(page: Page, name: FixtureName) {
  return page.locator(FIXTURES[name].composer).evaluate((el) =>
    el instanceof HTMLTextAreaElement ? el.value : (el as HTMLElement).innerText.trim(),
  );
}
