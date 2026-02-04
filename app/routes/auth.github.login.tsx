import type { Route } from "./+types/auth.github.login";
import { generateGithubAuthorizationUrl } from "~/lib/auth-providers.server";
import { setOAuthState } from "~/lib/oauth-state.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo") || "/";

  const { url: authUrl, state } = await generateGithubAuthorizationUrl();

  const stateCookie = await setOAuthState({
    state,
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
