import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrlConfigured } from "@/lib/site";

// Rendered per request so a runtime SITE_URL is honoured; prerendering this at
// build time would freeze in whatever origin was configured during the build.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Until a public origin is configured the deployment is treated as non-public,
  // so nothing is invited to crawl a preview or local environment.
  if (!siteUrlConfigured()) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /go is the tracked affiliate redirect and /admin is private; neither
        // should be crawled. /search produces thin, near-duplicate filter pages.
        disallow: ["/go/", "/admin", "/admin/", "/api/", "/search"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
