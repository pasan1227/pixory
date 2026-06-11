import type { MetadataRoute } from "next";
import { OCCASIONS } from "@/data/occasions";
import { siteUrl } from "@/lib/seo";

const STATIC_PATHS = [
  "/create",
  "/my-books",
  "/about",
  "/contact",
  "/delivery-and-payments",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base, priority: 1 },
    ...STATIC_PATHS.map((path) => ({ url: `${base}${path}`, priority: 0.7 })),
    ...OCCASIONS.map((occasion) => ({
      url: `${base}/occasions/${occasion.slug}`,
      priority: 0.8,
    })),
  ];
}
