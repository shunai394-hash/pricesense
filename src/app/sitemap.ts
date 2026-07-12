import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

const STATIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/legal", priority: 0.5, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
