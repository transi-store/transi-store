import type { Route } from "./+types/auth.login";
import { generateAuthorizationUrl } from "~/lib/auth.server";
import { setOAuthState } from "~/lib/oauth-state.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo") || "/";

  const { url: authUrl, codeVerifier, state } = await generateAuthorizationUrl();

  const stateCookie = await setOAuthState({
    state,
    codeVerifier,
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
