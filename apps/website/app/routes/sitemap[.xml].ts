import { DEFAULT_DOMAIN_ROOT } from "@transi-store/common";
import { AVAILABLE_LANGUAGES } from "~/lib/i18n";
import type { Route } from "./+types/sitemap[.xml]";

// Public pages to include in the sitemap
const PUBLIC_PATHS = ["/", "/pricing", "/docs/usage", "/docs/developer", "/api/doc"];

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const isProductionDomain = url.origin === DEFAULT_DOMAIN_ROOT;

  // Only serve a real sitemap on the production domain
  if (!isProductionDomain) {
    return new Response("", { status: 404 });
  }

  const entries = PUBLIC_PATHS.map((path) => {
    const canonicalHref = `${DEFAULT_DOMAIN_ROOT}${path}`;
    const alternates = AVAILABLE_LANGUAGES.map(
      (lang) =>
        `    <xhtml:link rel="alternate" hreflang="${lang.code}" href="${canonicalHref}?lng=${lang.code}"/>`,
    ).join("\n");

    return `  <url>
    <loc>${canonicalHref}</loc>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${canonicalHref}"/>
    <changefreq>weekly</changefreq>
    <priority>${path === "/" ? "1.0" : "0.8"}</priority>
  </url>`;
  }).join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
