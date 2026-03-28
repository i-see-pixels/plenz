import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@promptlens/ui"],
  images: {
    remotePatterns: [
      new URL("https://upload.wikimedia.org/**"),
      new URL("https://files.buildwithfern.com/**"),
      new URL("https://docs.mistral.ai/**"),
    ],
  },
};

export default nextConfig;
