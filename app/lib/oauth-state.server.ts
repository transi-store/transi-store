import { createCookie } from "react-router";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is not set");
}

const oauthStateCookie = createCookie("oauth_state", {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secrets: [SESSION_SECRET],
  secure: process.env.NODE_ENV === "production",
  maxAge: 600, // 10 minutes
});

type OAuthState = {
  state: string;
  codeVerifier?: string;
  redirectTo?: string;
};

export async function setOAuthState(state: OAuthState) {
  return await oauthStateCookie.serialize(state);
}

export async function getOAuthState(
  request: Request,
): Promise<OAuthState | null> {
  const cookie = request.headers.get("Cookie");
  const state = await oauthStateCookie.parse(cookie);
  return state ?? null;
}

export async function clearOAuthState() {
  return await oauthStateCookie.serialize(null, { maxAge: 0 });
}
