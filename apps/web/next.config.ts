import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Build a self-contained .next/standalone (server.js + only the traced node_modules)
  // so the Docker runtime image needs no pnpm install.
  output: "standalone",
  // Trace from the monorepo root: pnpm keeps real package files in the root
  // node_modules/.pnpm, which the default root (apps/web) would leave out.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Browser calls same-origin /api/trpc/*; Next forwards it to the API server.
  async rewrites() {
    return [
      {
        source: "/api/trpc/:path*",
        destination: `${process.env.API_URL}/trpc/:path*`,
      },
    ];
  },
};

export default nextConfig;
