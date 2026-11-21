import type { BrowserContext } from "@playwright/test";
import { expect, test } from "../fixtures";
import { useMockProvider } from "../pages";

const WELCOME = "/src/welcome/index.html";

function welcomeTab(context: BrowserContext) {
  return context.pages().find((page) => page.url().includes(WELCOME));
}

test("installing opens the welcome page, which turns ready once a provider is saved", async ({
  context,
  serviceWorker,
}) => {
  await expect.poll(() => welcomeTab(context)?.url()).toContain(WELCOME);
  const welcome = welcomeTab(context);
  if (!welcome) throw new Error("the welcome tab did not open");
  const status = welcome.locator("[data-setup-state]");

  // Headless Chromium has no on-device model ready, so nothing can refine yet.
  await expect(status).toHaveAttribute("data-setup-state", "needs-setup");
  await expect(status).toContainText("Connect an AI provider");

  await useMockProvider(serviceWorker, "http://127.0.0.1:9");
  await expect(status).toHaveAttribute("data-setup-state", "provider");
  await expect(welcome.getByLabel("Step 1, done")).toBeVisible();
});

test("the popup offers Finish setup until a provider works", async ({
  context,
  serviceWorker,
}) => {
  const extensionId = new URL(serviceWorker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/index.html`);

  const finish = popup.getByRole("button", { name: "Finish setup" });
  await expect(finish).toBeVisible();
  const opened = context.waitForEvent("page");
  await finish.click();
  await expect.poll(async () => (await opened).url()).toContain(WELCOME);

  await useMockProvider(serviceWorker, "http://127.0.0.1:9");
  const again = await context.newPage();
  await again.goto(`chrome-extension://${extensionId}/index.html`);
  await expect(again.getByText("Control panel")).toBeVisible();
  await expect(again.locator("[data-setup-state]")).toHaveCount(0);
});
