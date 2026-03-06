import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import manifest from "./public/manifest.json";

export default defineConfig(({ mode }) => {
  return {
    plugins: [tailwindcss(), preact(), crx({ manifest })],
    server: {
      port: 5173,
      strictPort: true,
      host: "localhost",
      hmr: {
        port: 5173,
        host: "localhost",
      },
      cors: true,
    },
    resolve: {
      alias: {
        react: "preact/compat",
        "react-dom": "preact/compat",
      },
    },
  };
});
