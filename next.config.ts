import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Site photos from the public Supabase bucket, resized for cards and the home page ring.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/site-media/**" }],
  },
  experimental: {
    // Photos are resized in the browser before upload (well under 1 MB), but leave room for large originals.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async redirects() {
    return [
      // Portal pages moved under /portal; keep old links working (query strings are passed through).
      { source: "/register", destination: "/portal/register", permanent: true },
      { source: "/payment/callback", destination: "/portal/payment/callback", permanent: true },
    ];
  },
};

export default nextConfig;
