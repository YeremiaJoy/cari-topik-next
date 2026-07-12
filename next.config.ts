import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ["192.168.100.15"],
};

export default nextConfig;
