import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.local",
    "*.localhost",
  ],
};

export default nextConfig;
