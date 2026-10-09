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
  // Old /register and /payment/callback links are redirected in proxy.ts, which knows which domain was asked for.
};

export default nextConfig;
