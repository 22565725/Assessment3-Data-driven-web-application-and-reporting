import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.compute-1.amazonaws.com",
    "*.compute.amazonaws.com",
  ],

  // The operational endpoints are reachable at both /health and /api/health.
  // The /api prefix keeps them consistent with the rest of the API surface;
  // the bare paths are the conventional locations a load balancer or uptime
  // monitor probes without knowing anything about the application.
  async rewrites() {
    return [
      { source: "/health", destination: "/api/health" },
      { source: "/count", destination: "/api/count" },
    ];
  },
};

export default nextConfig;
