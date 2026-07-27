import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  experimental: {
    // Default is 10MB — the proxy buffers the whole request body in memory,
    // and anything past the cap is silently truncated (no error). Workshop
    // video uploads need real headroom here.
    proxyClientMaxBodySize: '400mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zrydlelcdcizuybkargl.supabase.co',
      },
    ],
  },
};

export default nextConfig;
