import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import manifest from "./public/manifest.json";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not defined in the environment.");
  }

  // Dynamically inject the Client ID from environment variables
  const dynamicManifest = {
    ...manifest,
    oauth2: {
      ...(manifest as any).oauth2,
      client_id: env.GOOGLE_CLIENT_ID,
    },
  };

  return {
    plugins: [tailwindcss(), preact(), crx({ manifest: dynamicManifest })],
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
