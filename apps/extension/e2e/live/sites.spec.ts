import type { Page } from "@playwright/test";
import { PLATFORMS } from "../../src/content/editors/platforms";
import { expect, test } from "../fixtures";
import { ShadowDom } from "../shadow";

/**
 * Scheduled canary against the real chat sites: does each adapter still find
 * the composer, and does the extension come alive when you type? Sites that
 * show a login wall or bot check to a fresh, signed-out browser are skipped,
 * not failed, since nothing about plenz can be checked there.
 */
const START_URLS: Record<string, string> = {
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
  gemini: "https://gemini.google.com/app",
  perplexity: "https://www.perplexity.ai/",
};

async function blockedReason(page: Page): Promise<string | null> {
  const url = page.url();
  if (/\/(login|signin|sign-in|auth)\b|accounts\.google\.com/i.test(url)) {
    return `redirected to sign-in (${new URL(url).host})`;
  }
  const title = await page.title().catch(() => "");
  const text = (
    await page
      .locator("body")
      // biome-ignore lint/performance/useDomNodeTextContent: Playwright's innerText gives only visible text, which is what a bot-check page shows
      .innerText()
      .catch(() => "")
  ).slice(0, 4000);
  // Cloudflare and similar interstitials; the test never tries to get past them.
  const botCheck =
    /just a moment|verify you are human|security verification|not a bot|unusual traffic|captcha/i;
  if (botCheck.test(title) || botCheck.test(text)) {
    return `bot check ("${title || "untitled"}")`;
  }
  // Only a real sign-in form counts; a "Sign in" link in the nav does not, or
  // a stale selector would hide behind it.
  if (
    await page
      .locator('input[type="password"]')
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    return "sign-in form";
  }
  return null;
}

for (const platform of PLATFORMS) {
  test(`${platform.name}: composer found and extension responds`, async ({
    context,
  }) => {
    const page = await context.newPage();
    await page.goto(START_URLS[platform.name], {
      waitUntil: "domcontentloaded",
    });

    const composer = page.locator(platform.inputSelectors.join(", ")).first();
    const found = await composer
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (!found) {
      const reason = await blockedReason(page);
      test.skip(reason !== null, `Skipped: ${reason}`);
      expect(
        found,
        `No composer matched ${platform.inputSelectors.join(" | ")}; selectors may be stale`,
      ).toBe(true);
    }

    await composer.click();
    await page.keyboard.type(
      "write a short update for my team about the launch",
    );
    const shadow = await ShadowDom.attach(page);
    await expect
      .poll(() => shadow.visible("plenz-badge-host", ".pl-lint-score"), {
        timeout: 10_000,
      })
      .toBe(true);
  });
}
