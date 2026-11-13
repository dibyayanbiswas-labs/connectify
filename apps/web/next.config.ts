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
  // The /api/trpc forward lives in proxy.ts, so API_URL is read at runtime, not baked in here.
  poweredByHeader: false,
  // Baseline security headers on every page. A Content-Security-Policy needs per-request
  // nonces in Next.js; add it with the first third-party script or user-generated HTML.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
