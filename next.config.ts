import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mongodb"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "gpcrdb.org" },
      { protocol: "https", hostname: "cdn.rcsb.org" },
    ],
  },
};

export default nextConfig;
