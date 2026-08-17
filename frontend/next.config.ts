import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a minimal, self-contained server (.next/standalone) that only
  // includes the node_modules a request actually traces through - this is
  // what keeps the production Docker image small. See Dockerfile.
  output: "standalone",

  // Don't advertise the framework to clients (mirrors nginx's
  // `server_tokens off`).
  poweredByHeader: false,
};

export default nextConfig;
