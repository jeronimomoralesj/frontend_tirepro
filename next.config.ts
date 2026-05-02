import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "tireproimages.s3.us-east-1.amazonaws.com" },
      { protocol: "https", hostname: "tirepro.com.co" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS for two years incl. subdomains, request preload list
          // inclusion. Once preloaded the browser refuses HTTP entirely —
          // worth the lockup since the entire surface is HTTPS-only already.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Permissions-Policy locks down sensors we don't use (camera /
          // mic / geolocation are explicitly denied for cross-origin frames
          // since the only camera surface we use lives on this same origin).
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(self), interest-cohort=()" },
        ],
      },
      {
        source: "/(.*)\\.(js|css|woff2|png|jpg|svg|avif|webp)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
