import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.compute-1.amazonaws.com",
    "*.compute.amazonaws.com",
  ],

  // Several endpoints answer at both their /api path and a bare conventional
  // path. The /api prefix keeps them consistent with the rest of the API
  // surface; the bare paths are where an outside tool looks without knowing
  // anything about this application.
  //
  //   /health, /count      what a load balancer or uptime monitor probes
  //   /rss.xml, /feed.xml  what a feed reader, browser extension or
  //                        autodiscovery crawler tries first
  //
  // Rewrites rather than duplicate route files, so there is exactly one
  // implementation of each handler. Query strings are carried through, so
  // /rss.xml?feedId=1 reaches the same code as /api/rss?feedId=1.
  async rewrites() {
    return [
      { source: "/health", destination: "/api/health" },
      { source: "/count", destination: "/api/count" },
      { source: "/rss.xml", destination: "/api/rss" },
      { source: "/feed.xml", destination: "/api/rss" },
    ];
  },
};

export default nextConfig;
