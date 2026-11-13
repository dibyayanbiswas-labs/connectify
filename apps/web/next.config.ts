import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
