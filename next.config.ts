import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Components were renamed to match their site titles (Task 5). These keep the
  // old shared links working — the slugs are the only names that changed.
  async redirects() {
    return [
      {
        source: "/components/expanded-navigation",
        destination: "/components/soft-menu-reveal",
        permanent: true,
      },
      {
        source: "/components/gradient-aura",
        destination: "/components/gradient-gummy-bear",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
