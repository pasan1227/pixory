import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/editor",
        "/checkout",
        "/order",
        "/resume",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
