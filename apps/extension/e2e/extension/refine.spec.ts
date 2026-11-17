import { expect, test } from "../fixtures";
import { modeOf, startMockProvider, type MockReply } from "../mock-provider";
import { composerText, FIXTURES, openFixture, useMockProvider, type FixtureName } from "../pages";
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

test("rich editors receive the replacement as one paste", async ({ context }) => {
  const page = await openFixture(context, "claude");
  const shadow = await ShadowDom.attach(page);
  await typeDraft(page, "claude");
  await refineToResult(page, shadow);
  await page.keyboard.press("Tab");

  await expect.poll(() => composerText(page, "claude")).toBe(IMPROVED);
  expect(await page.evaluate(() => (window as unknown as { __pastes: number }).__pastes)).toBe(1);
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
