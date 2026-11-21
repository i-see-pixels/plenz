import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BrowserContext,
  test as base,
  chromium,
  type Worker,
} from "@playwright/test";

const EXTENSION_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist",
);

type Fixtures = {
  context: BrowserContext;
  /** The extension's background service worker. */
  serviceWorker: Worker;
};

/**
 * Each test gets a fresh Chromium profile with the built extension loaded
 * (run `pnpm build` first). Extensions need the full Chromium build, which
 * also runs headless.
 */
export const test = base.extend<Fixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright reads fixture dependencies from this destructuring, so it must stay an object pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless: !process.env.HEADED,
      args: [
        `--disable-extensions-except=${EXTENSION_DIR}`,
        `--load-extension=${EXTENSION_DIR}`,
      ],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    const worker =
      context
        .serviceWorkers()
        .find((w) => w.url().startsWith("chrome-extension://")) ??
      (await context.waitForEvent("serviceworker"));
    await use(worker);
  },
});

export const expect = test.expect;
