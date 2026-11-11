import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
  turbopack: {
    root: process.cwd(),
  },
  // Let phones on the same Wi-Fi open the dev server by its LAN address;
  // Next blocks dev resources (HMR, chunks) for any other hostname.
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.*.*", "10.*.*.*", "*.local"],
  // Components were renamed to match their site titles. These keep the
  // old shared links working — the slugs are the only names that changed.
  async redirects() {
    return [
      {
        source: "/3d-studio/guava-on-silver",
        destination: "/3d-studio/mango-on-silver",
        permanent: true,
      },
      {
        source: "/3d-studio/apple-club",
        destination: "/3d-studio/little-nap",
        permanent: true,
      },
      {
        source: "/still-life",
        destination: "/3d-studio",
        permanent: true,
      },
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
