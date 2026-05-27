import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.119.101"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
