import type { NextConfig } from "next";

// Always build from this folder (ignores stray lockfiles in parent directories).
const root = process.cwd();

const nextConfig: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  // better-sqlite3 loads a prebuilt native binary at runtime; make sure it's copied into the bundle.
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/better-sqlite3/prebuilds/linux*.node"],
  },
  poweredByHeader: false,
  // The dev-mode "N" badge would sit on the phone bottom bar; errors are still shown without it.
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
