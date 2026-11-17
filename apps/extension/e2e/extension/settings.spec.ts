import type { Worker } from "@playwright/test";
import { expect, test } from "../fixtures";

function extensionPage(serviceWorker: Worker, path: string) {
  return `chrome-extension://${new URL(serviceWorker.url()).host}/${path}`;
}

test("settings save as they change, for chat pages too", async ({ context, serviceWorker }) => {
  const settings = await context.newPage();
  await settings.goto(extensionPage(serviceWorker, "src/options/index.html"));

  await settings.getByRole("switch", { name: "Refine automatically while typing" }).click();
  await expect(settings.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  // The pause choice only appears while auto-refine is on.
  await settings.getByRole("combobox", { name: "Refine after a pause of" }).click();
  await settings.getByRole("option", { name: "2 seconds" }).click();

  // Chat pages read the local copy.
  await expect
    .poll(() =>
      serviceWorker.evaluate(async () => (await chrome.storage.local.get("preferences")).preferences),
    )
    .toMatchObject({ autoRefineEnabled: true, debounceTime: 2000, debounceMs: 2000 });
});

test("the theme setting applies to every plenz page at once", async ({ context, serviceWorker }) => {
  const settings = await context.newPage();
  await settings.goto(extensionPage(serviceWorker, "src/options/index.html"));
  const popup = await context.newPage();
  await popup.goto(extensionPage(serviceWorker, "index.html"));

  await settings.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(settings.locator("html")).toHaveClass(/\bdark\b/);
  await expect(popup.locator("html")).toHaveClass(/\bdark\b/);

  await settings.getByRole("button", { name: "Light", exact: true }).click();
  await expect(settings.locator("html")).not.toHaveClass(/\bdark\b/);
  await expect(popup.locator("html")).not.toHaveClass(/\bdark\b/);
});
