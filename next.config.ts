import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained production server at .next/standalone — used by Dockerfile.
  output: "standalone",
  // better-sqlite3 is a native module; let Next bundle it without trying to
  // transform it for the edge runtime.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
