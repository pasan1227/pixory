import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photo originals upload through server actions; default is 1MB.
      // Must stay >= ORIGINAL_MAX_BYTES in src/lib/schemas/photo.ts.
      bodySizeLimit: "30mb",
    },
  },
  images: {
    // Marketing placeholders (src/data/images.ts) until real photography.
    remotePatterns: [{ protocol: "https", hostname: "placehold.co" }],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "script-src 'none'; sandbox;",
  },
};

export default nextConfig;
