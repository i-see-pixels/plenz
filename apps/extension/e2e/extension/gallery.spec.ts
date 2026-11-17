import { expect, test } from "../fixtures";

test("signed out, the Saved tab explains itself and offers sign-in", async ({
  context,
  serviceWorker,
}) => {
  const gallery = await context.newPage();
  await gallery.goto(
    `chrome-extension://${new URL(serviceWorker.url()).host}/src/sidepanel/index.html`,
  );

  await gallery.getByRole("button", { name: /^Saved\s*\d+$/ }).click();
  const state = gallery.locator('[data-gallery-state="Your saved prompts"]');
  await expect(state).toContainText("Sign in with Google to keep your own prompts");
  await expect(state.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
});
