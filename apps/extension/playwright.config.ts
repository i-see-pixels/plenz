import { defineConfig } from "@playwright/test";

/**
 * Both projects load the built extension from dist/, so run `pnpm build` first.
 * - extension: deterministic end-to-end tests on fixture pages served at the
 *   real chat hosts, with a local mock provider. Runs on every PR.
 * - live: scheduled smoke test against the real sites, to catch markup changes.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "extension", testDir: "./e2e/extension" },
    { name: "live", testDir: "./e2e/live", timeout: 60_000, retries: 0 },
    { name: "spike", testMatch: "spike.spec.ts" },
  ],
});
