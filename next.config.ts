import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mysql2"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "gpcrdb.org" },
      { protocol: "https", hostname: "cdn.rcsb.org" },
    ],
  },
};

export default nextConfig;
