import type { Route } from "./+types/auth.callback";
import { exchangeCodeForUser } from "~/lib/auth.server";
import { getOAuthState, clearOAuthState } from "~/lib/oauth-state.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    throw new Response("Missing code or state parameter", { status: 400 });
  }

  const oauthState = await getOAuthState(request);
  if (!oauthState) {
    throw new Response("OAuth state not found", { status: 400 });
  }

  const redirectTo = oauthState.redirectTo || "/";

  const response = await exchangeCodeForUser(
    code,
    state,
    oauthState.codeVerifier,
    oauthState.state,
    redirectTo,
  );

  // Supprimer le cookie d'état OAuth
  const clearStateCookie = await clearOAuthState();
  response.headers.append("Set-Cookie", clearStateCookie);

  return response;
}
