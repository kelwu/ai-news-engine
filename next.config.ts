import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      // Instagram thumbnails copied into Supabase Storage (lib/instagram.ts)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/thumbnails/**" },
    ],
  },
};

export default nextConfig;
