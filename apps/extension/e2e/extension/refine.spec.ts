import { expect, test } from "../fixtures";
import { modeOf, startMockProvider, type MockReply } from "../mock-provider";
import { composerText, FIXTURES, openFixture, useMockProvider, type FixtureName } from "../pages";
import type { Learning } from "../../src/shared/learning";
import { ShadowDom } from "../shadow";

const BADGE = "plenz-badge-host";
const PANEL = "plenz-refine-panel";
const DRAFT = "write a launch email for our analytics feature";
const IMPROVED =
  "Write a friendly launch email announcing our new analytics feature to existing customers, under 150 words.";
const REFINE = "Control+Shift+Enter";

let reply: (mode: string) => MockReply = () => ({ chunks: IMPROVED.match(/.{1,12}/g)! });
let mock: Awaited<ReturnType<typeof startMockProvider>>;

test.beforeEach(async ({ serviceWorker }) => {
  reply = () => ({ chunks: IMPROVED.match(/.{1,12}/g)! });
  mock = await startMockProvider((request) => reply(modeOf(request)));
  await useMockProvider(serviceWorker, mock.baseUrl);
});

test.afterEach(async () => {
  await mock.close();
});

async function typeDraft(page: import("@playwright/test").Page, name: FixtureName) {
  await page.locator(FIXTURES[name].composer).click();
  await page.keyboard.type(DRAFT);
}

/** Refine with Improve and wait for the finished result in the panel. */
async function refineToResult(page: import("@playwright/test").Page, shadow: ShadowDom) {
  await page.keyboard.press(REFINE);
  await expect
    .poll(() => shadow.text(PANEL, ".pl-header"), { timeout: 10_000 })
    .toContain("ready");
}

test("typing shows the local prompt score and calls no provider", async ({ context }) => {
  const page = await openFixture(context, "chatgpt");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "chatgpt");

  await expect.poll(() => shadow.text(BADGE, ".pl-lint-score")).toMatch(/^\d+$/);
  await page.waitForTimeout(800); // longer than any debounce
  expect(mock.requests).toHaveLength(0);
});

test("the shortcut streams Improve into the panel and Tab replaces the draft", async ({ context }) => {
  const page = await openFixture(context, "chatgpt");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "chatgpt");
  await refineToResult(page, shadow);

  const request = mock.requests[0];
  expect(modeOf(request)).toBe("improve");
  expect(request.body.messages?.find((m) => m.role === "user")?.content).toContain(DRAFT);

  await page.keyboard.press("Tab");
  await expect.poll(() => composerText(page, "chatgpt")).toBe(IMPROVED);
  expect(await shadow.visible(PANEL, ".pl-header")).toBe(false);
});

test("after a replace, the page's own Ctrl+Z brings the draft back", async ({ context }) => {
  const page = await openFixture(context, "chatgpt");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "chatgpt");
  await refineToResult(page, shadow);
  await page.keyboard.press("Tab");
  await expect.poll(() => composerText(page, "chatgpt")).toBe(IMPROVED);

  await page.keyboard.press("Control+Z");
  await expect.poll(() => composerText(page, "chatgpt")).toBe(DRAFT);
});

test("the badge's Undo restores the draft", async ({ context }) => {
  const page = await openFixture(context, "chatgpt");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "chatgpt");
  await refineToResult(page, shadow);
  await page.keyboard.press("Tab");
  await expect.poll(() => composerText(page, "chatgpt")).toBe(IMPROVED);

  await expect.poll(() => shadow.visible(BADGE, ".pl-undo")).toBe(true);
  await shadow.click(BADGE, ".pl-undo");
  await expect.poll(() => composerText(page, "chatgpt")).toBe(DRAFT);
});

test("rich editors that track their own selection get the whole draft replaced", async ({ context }) => {
  const page = await openFixture(context, "claude");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "claude");
  await refineToResult(page, shadow);
  await page.keyboard.press("Tab");

  await expect.poll(() => composerText(page, "claude")).toBe(IMPROVED);
  // Native insertText took it, so the site never saw a paste it could turn into an attachment.
  expect(await page.evaluate(() => (window as unknown as { __pastes: number }).__pastes)).toBe(0);
});

test("textareas get the replacement with their native undo intact", async ({ context }) => {
  const page = await openFixture(context, "perplexity");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "perplexity");
  await refineToResult(page, shadow);
  await page.keyboard.press("Tab");
  await expect.poll(() => composerText(page, "perplexity")).toBe(IMPROVED);

  await page.keyboard.press("Control+Z");
  await expect.poll(() => composerText(page, "perplexity")).toBe(DRAFT);
});

test("typing during a refine cancels the provider request", async ({ context }) => {
  reply = () => ({ chunks: Array.from({ length: 40 }, (_, i) => `word${i} `), delayMs: 150 });
  const page = await openFixture(context, "chatgpt");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "chatgpt");
  await page.keyboard.press(REFINE);
  await expect.poll(() => shadow.text(PANEL, ".pl-output")).toContain("word1");

  await page.keyboard.type("!");
  await expect.poll(() => mock.requests[0]?.aborted, { timeout: 5_000 }).toBe(true);
  expect(mock.requests[0].finished).toBe(false);
});

test("the badge opens the mode picker without calling the provider; a mode then refines", async ({
  context,
}) => {
  reply = (mode) => ({ chunks: [mode === "tighten" ? "Short launch email." : IMPROVED] });
  const page = await openFixture(context, "chatgpt");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "chatgpt");
  await expect.poll(() => shadow.visible(BADGE, ".pl-lint-score")).toBe(true);

  await shadow.click(BADGE, ".pl-lint-score");
  await expect.poll(() => shadow.text(PANEL, ".pl-header")).toContain("Refine prompt");
  expect(mock.requests).toHaveLength(0);

  await shadow.click(PANEL, ".pl-mode-card:nth-child(2)"); // Tighten
  await expect.poll(() => shadow.text(PANEL, ".pl-header"), { timeout: 10_000 }).toContain("Tighten");
  // The header switches as soon as the mode is picked; the request lands a moment later.
  await expect.poll(() => mock.requests[0] && modeOf(mock.requests[0])).toBe("tighten");

  await page.keyboard.press("Escape");
  await expect.poll(() => shadow.visible(PANEL, ".pl-header")).toBe(false);
});

test("a context card from the picker goes above the draft without calling the provider", async ({
  context,
  serviceWorker,
}) => {
  const CARD = "I'm the PM at a small analytics startup.";
  await serviceWorker.evaluate(async (text) => {
    await chrome.storage.local.set({ contextCards: [{ id: "me", title: "About me", text }] });
  }, CARD);
  // A textarea, so the composer's value is exactly what was written.
  const page = await openFixture(context, "perplexity");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "perplexity");
  await expect.poll(() => shadow.visible(BADGE, ".pl-lint-score")).toBe(true);

  await shadow.click(BADGE, ".pl-lint-score");
  await expect.poll(() => shadow.text(PANEL, ".pl-card-chip")).toBe("About me");
  await shadow.click(PANEL, ".pl-card-chip");

  await expect.poll(() => composerText(page, "perplexity")).toBe(`${CARD}\n\n${DRAFT}`);
  expect(await shadow.visible(PANEL, ".pl-header")).toBe(false);
  expect(mock.requests).toHaveLength(0);

  await expect.poll(() => shadow.visible(BADGE, ".pl-undo")).toBe(true);
  await shadow.click(BADGE, ".pl-undo");
  await expect.poll(() => composerText(page, "perplexity")).toBe(DRAFT);
});

test.describe("the / command", () => {
  const SLASH = "plenz-slash-menu";
  const CARDS = [
    { id: "me", title: "About me", text: "I'm the PM at a small analytics startup." },
    { id: "tone", title: "Tone", text: "Keep it short and friendly." },
  ];

  test.beforeEach(async ({ serviceWorker }) => {
    await serviceWorker.evaluate(async (cards) => {
      await chrome.storage.local.set({ contextCards: cards });
    }, CARDS);
  });

  test("lists cards, filters as you type, and Enter inserts without reaching the page", async ({
    context,
  }) => {
    const page = await openFixture(context, "perplexity");
    const shadow = await ShadowDom.attach(page);
    await page.evaluate(() => {
      const w = window as unknown as { __enters: number };
      w.__enters = 0;
      document.querySelector("textarea")!.addEventListener("keydown", (event) => {
        if (event.key === "Enter") w.__enters++;
      });
    });
    await page.locator("textarea").click();
    await page.keyboard.type("Context first\n/");

    await expect.poll(() => shadow.text(SLASH, ".pl-slash-item .pl-slash-title")).toBe("About me");
    await page.keyboard.type("to");
    await expect.poll(() => shadow.text(SLASH, ".pl-slash-item .pl-slash-title")).toBe("Tone");

    await page.keyboard.press("Enter");
    await expect
      .poll(() => composerText(page, "perplexity"))
      .toBe("Context first\nKeep it short and friendly.");
    expect(await shadow.visible(SLASH, ".pl-slash-item")).toBe(false);
    // The newline typed above is the only Enter the page saw.
    expect(await page.evaluate(() => (window as unknown as { __enters: number }).__enters)).toBe(1);
    expect(mock.requests).toHaveLength(0);
  });

  test("arrow keys choose, Esc closes until the draft changes", async ({ context }) => {
    const page = await openFixture(context, "perplexity");
    const shadow = await ShadowDom.attach(page);
    await page.locator("textarea").click();
    await page.keyboard.type("/");
    await expect.poll(() => shadow.text(SLASH, ".selected .pl-slash-title")).toBe("About me");

    await page.keyboard.press("ArrowDown");
    await expect.poll(() => shadow.text(SLASH, ".selected .pl-slash-title")).toBe("Tone");
    await page.keyboard.press("Escape");
    await expect.poll(() => shadow.visible(SLASH, ".pl-slash-item")).toBe(false);

    await page.keyboard.type("a");
    await expect.poll(() => shadow.text(SLASH, ".selected .pl-slash-title")).toBe("About me");
    await page.keyboard.press("Tab");
    await expect.poll(() => composerText(page, "perplexity")).toBe(CARDS[0].text);
  });

  test("works in a rich editor too", async ({ context }) => {
    const page = await openFixture(context, "claude");
    const shadow = await ShadowDom.attach(page);
    await page.locator(FIXTURES.claude.composer).click();
    await page.keyboard.type("/about");
    await expect.poll(() => shadow.text(SLASH, ".selected .pl-slash-title")).toBe("About me");
    await page.keyboard.press("Enter");
    await expect.poll(() => composerText(page, "claude")).toBe(CARDS[0].text);
  });

  test("a slash in the middle of prose opens nothing", async ({ context }) => {
    const page = await openFixture(context, "perplexity");
    const shadow = await ShadowDom.attach(page);
    await page.locator("textarea").click();
    await page.keyboard.type("compare a/b test results");
    await page.waitForTimeout(300);
    expect(await shadow.visible(SLASH, ".pl-slash-item")).toBe(false);
  });
});

test.describe("local learning", () => {
  const learningIn = (serviceWorker: import("@playwright/test").Worker) =>
    serviceWorker.evaluate(
      async () => ((await chrome.storage.local.get("learning")).learning ?? null) as Learning | null,
    );

  test("replacing with a result and sending a draft are recorded on this device", async ({
    context,
    serviceWorker,
  }) => {
    const page = await openFixture(context, "chatgpt");
    const shadow = await ShadowDom.attach(page);
    await typeDraft(page, "chatgpt");
    await refineToResult(page, shadow);
    await page.keyboard.press("Tab");
    await expect
      .poll(async () => (await learningIn(serviceWorker))?.modes?.improve)
      .toEqual({ accepted: 1, dismissed: 0 });
    // The accept is recorded before the replace finishes writing.
    await expect.poll(() => composerText(page, "chatgpt")).toBe(IMPROVED);

    await page.locator(FIXTURES.chatgpt.composer).fill("");
    await typeDraft(page, "chatgpt");
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => (await learningIn(serviceWorker))?.checks?.no_audience?.ignored)
      .toBe(1);
  });

  test("a mode you keep accepting is suggested, and a check you keep ignoring is hidden", async ({
    context,
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({
        learning: {
          modes: { structure: { accepted: 4, dismissed: 1 } },
          checks: { no_audience: { fixed: 0, ignored: 6 } },
        },
      });
    });
    const page = await openFixture(context, "chatgpt");
    const shadow = await ShadowDom.attach(page);
    await typeDraft(page, "chatgpt");

    // 70 with three 10-point checks; the ignored one no longer counts.
    await expect.poll(() => shadow.text(BADGE, ".pl-lint-score")).toBe("80");
    await shadow.click(BADGE, ".pl-lint-score");
    await expect
      .poll(() => shadow.text(PANEL, ".pl-mode-card.recommended .pl-mode-name"))
      .toBe("Structure");
    expect(await shadow.text(PANEL, ".pl-muted")).not.toContain("audience");
  });
});

test("a rejected API key explains itself and offers to open settings", async ({ context }) => {
  reply = () => ({ chunks: [], error: { status: 401, message: "Incorrect API key provided: test-key" } });
  const page = await openFixture(context, "chatgpt");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "chatgpt");
  await page.keyboard.press(REFINE);

  await expect.poll(() => shadow.text(PANEL, ".pl-error")).toContain("rejected the API key");
  expect(await shadow.text(PANEL, ".pl-error-detail")).toBe("401: Incorrect API key provided: test-key");

  const settings = context.waitForEvent("page");
  await shadow.click(PANEL, ".pl-actions .pl-btn-primary");
  expect((await settings).url()).toContain("/src/options/index.html");
});

test("on a dark page the overlays turn dark", async ({ context }) => {
  const page = await openFixture(context, "chatgpt");
  await page.evaluate(() => {
    document.body.style.background = "#212121";
    document.body.style.color = "#eee";
  });
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "chatgpt");
  await expect.poll(() => shadow.visible(BADGE, ".pl-lint-score")).toBe(true);
  expect(await page.evaluate(() => document.getElementById("plenz-badge-host")!.classList.contains("pl-dark"))).toBe(
    true,
  );
});
