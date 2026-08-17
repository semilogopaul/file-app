import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // The repo root holds its own package-lock.json (git hooks + task
    // runner), so Turbopack's workspace-root inference would otherwise walk
    // up past this app and warn. The frontend is self-contained - pin it.
    root: path.join(__dirname),
  },

  // Emits a minimal, self-contained server (.next/standalone) that only
  // includes the node_modules a request actually traces through - this is
  // what keeps the production Docker image small. See Dockerfile.
  output: "standalone",

  // Don't advertise the framework to clients (mirrors nginx's
  // `server_tokens off`).
  poweredByHeader: false,
};

export default nextConfig;
