import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photo originals upload through server actions; default is 1MB.
      // Must stay >= ORIGINAL_MAX_BYTES in src/lib/schemas/photo.ts.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
