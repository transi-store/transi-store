import { DEFAULT_DOMAIN_ROOT } from "@transi-store/common";
import type { Route } from "./+types/robots[.txt]";

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const isProductionDomain = url.origin === DEFAULT_DOMAIN_ROOT;

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
