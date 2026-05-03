import { Outlet, redirect } from "react-router";
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE_CODE } from "~/lib/i18n";
import type { Route } from "./+types/locale-prefix-layout";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { lng } = params;

  // Canonical English lives at the un-prefixed URL: 301 to drop the redundant /en/ prefix
  if (lng === DEFAULT_LANGUAGE_CODE) {
    const url = new URL(request.url);
    const stripped = url.pathname.replace(/^\/[^/]+/, "") || "/";
    throw redirect(`${stripped}${url.search}`, 301);
  }

  const isSupported = AVAILABLE_LANGUAGES.some((lang) => lang.code === lng);
  if (!isSupported) {
    throw new Response("Not Found", { status: 404 });
  }

  return null;
}

export default function LocalePrefixLayout() {
  return <Outlet />;
}
