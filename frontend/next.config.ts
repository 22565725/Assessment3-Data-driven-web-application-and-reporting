import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Wildcard rather than a literal IP: a Learner Lab instance gets a new
  // public DNS name every stop/start, and this pattern matches all of them.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.compute-1.amazonaws.com",
    "*.compute.amazonaws.com",
  ],
};

export default nextConfig;
