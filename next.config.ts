import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    RefreshIntervalTime: process.env.RefreshIntervalTime || "0.133",
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/blitz/:path*`
      }
    ];
  }
};

export default nextConfig;
