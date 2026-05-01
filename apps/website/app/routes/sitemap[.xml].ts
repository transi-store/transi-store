import XMLBuilder from "fast-xml-builder";
import { DEFAULT_DOMAIN_ROOT } from "@transi-store/common";
import { AVAILABLE_LANGUAGES } from "~/lib/i18n";
import type { Route } from "./+types/sitemap[.xml]";

// Public pages to include in the sitemap
const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/docs/usage",
  "/docs/developer",
  "/api/doc",
];

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  indentBy: "  ",
  suppressEmptyNode: true,
  processEntities: true,
});

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const isProductionDomain = url.origin === DEFAULT_DOMAIN_ROOT;

  // Only serve a real sitemap on the production domain
  if (!isProductionDomain && import.meta.env.PROD) {
    return new Response("sitemap is not available on this domain", {
      status: 404,
    });
  }

  const doc = {
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    urlset: {
      "@_xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
      "@_xmlns:xhtml": "http://www.w3.org/1999/xhtml",
      url: PUBLIC_PATHS.map((path) => {
        const canonicalHref = `${DEFAULT_DOMAIN_ROOT}${path}`;
        return {
          loc: canonicalHref,
          "xhtml:link": [
            ...AVAILABLE_LANGUAGES.map((lang) => ({
              "@_rel": "alternate",
              "@_hreflang": lang.code,
              // TODO Change this when using plain url (/fr/docs/usage instead of /docs/usage?lng=fr)
              "@_href": `${canonicalHref}?lng=${lang.code}`,
            })),
            {
              "@_rel": "alternate",
              "@_hreflang": "x-default",
              "@_href": canonicalHref,
            },
          ],
          changefreq: "weekly",
          priority: path === "/" ? "1.0" : "0.8",
        };
      }),
    },
  };

  const sitemap = builder.build(doc).trimEnd();

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
