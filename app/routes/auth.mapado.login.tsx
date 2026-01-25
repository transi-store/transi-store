import type { Route } from "./+types/auth.mapado.login";
import { generateMapadoAuthorizationUrl } from "~/lib/auth-providers.server";
import { setOAuthState } from "~/lib/oauth-state.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const redirectTo =
    url.searchParams.get("redirect") ||
    url.searchParams.get("redirectTo") ||
    "/";

  const {
    url: authUrl,
    codeVerifier,
    state,
  } = await generateMapadoAuthorizationUrl();

  const stateCookie = await setOAuthState({
    state,
    codeVerifier: codeVerifier!,
    redirectTo,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      "Set-Cookie": stateCookie,
    },
  });
}
