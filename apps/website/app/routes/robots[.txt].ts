import type { Route } from "./+types/robots[.txt]";

const PRODUCTION_ORIGIN = "https://transi-store.com";

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const isProductionDomain = url.origin === PRODUCTION_ORIGIN;

  const robotsTxt = isProductionDomain
    ? "User-agent: *\nAllow: /\n"
    : "User-agent: *\nDisallow: /\n";

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
