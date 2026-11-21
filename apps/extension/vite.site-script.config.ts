import { defineConfig } from "vite";

/**
 * Builds the content script as one self-contained file for sites the user
 * turns on from the popup (see src/background/sites.ts). chrome.scripting
 * injects it directly, so unlike the crxjs loader it needs no
 * web_accessible_resources, which would let any website detect the extension.
 * Runs after the main build and writes into the same dist folder.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: "src/content/index.ts",
      formats: ["iife"],
      name: "plenzSiteContentScript",
      // Referenced by name in src/background/sites.ts.
      fileName: () => "site-content-script.js",
    },
  },
});
