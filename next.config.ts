import type { NextConfig } from "next";

const BACKEND_URL = (process.env.BACKEND_URL ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["192.168.100.98", "192.168.100.186", "192.168.1.144"],
  experimental: {
    agentFeedback: true,
    cpus: 2,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/auth",
        destination: `${BACKEND_URL}/auth`,
      },
      {
        source: "/auth/:path*",
        destination: `${BACKEND_URL}/auth/:path*`,
      },
      {
        source: "/users",
        destination: `${BACKEND_URL}/users`,
      },
      {
        source: "/users/:path*",
        destination: `${BACKEND_URL}/users/:path*`,
      },
      {
        source: "/mineral-batches",
        destination: `${BACKEND_URL}/mineral-batches`,
      },
      {
        source: "/mineral-batches/:path*",
        destination: `${BACKEND_URL}/mineral-batches/:path*`,
      },
      {
        source: "/values",
        destination: `${BACKEND_URL}/values`,
      },
      {
        source: "/values/:path*",
        destination: `${BACKEND_URL}/values/:path*`,
      },
      {
        source: "/processing-stages",
        destination: `${BACKEND_URL}/processing-stages`,
      },
      {
        source: "/processing-stages/:path*",
        destination: `${BACKEND_URL}/processing-stages/:path*`,
      },
    ];
  },
};

export default nextConfig;
