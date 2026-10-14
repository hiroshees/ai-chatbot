import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security-headers.ts";

const nextConfig: NextConfig = {
  // Cloud Run 向けに最小構成の server.js を出力する
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(process.env.NODE_ENV !== "production"),
      },
    ];
  },
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
};

export default nextConfig;
