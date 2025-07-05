import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript enabled, ESLint temporarily disabled for testing
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
