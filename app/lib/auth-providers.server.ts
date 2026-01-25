import { Google } from "arctic";
import crypto from "node:crypto";

// Configuration OAuth2 générique (existant)
const OAUTH_AUTHORIZATION_URL = process.env.OAUTH_AUTHORIZATION_URL;
const OAUTH_TOKEN_URL = process.env.OAUTH_TOKEN_URL;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;
const OAUTH_SCOPES = process.env.OAUTH_SCOPES || "";

// Configuration Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export type OAuthProvider = "mapado" | "google";

export interface ProviderConfig {
  type: OAuthProvider;
  name: string;
  enabled: boolean;
}

export const AVAILABLE_PROVIDERS: ProviderConfig[] = [
  {
    type: "mapado",
    name: "Mapado",
    enabled: !!(
      OAUTH_AUTHORIZATION_URL &&
      OAUTH_TOKEN_URL &&
      OAUTH_CLIENT_ID &&
      OAUTH_CLIENT_SECRET &&
      OAUTH_REDIRECT_URI
    ),
  },
  {
    type: "google",
    name: "Google",
    enabled: !!(
      GOOGLE_CLIENT_ID &&
      GOOGLE_CLIENT_SECRET &&
      GOOGLE_REDIRECT_URI
    ),
  },
];

// Helpers pour générer code_verifier et state
function generateRandomString(length: number = 43): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

export interface AuthorizationUrlResult {
  url: string;
  codeVerifier?: string;
  state: string;
}

// Google OAuth
let googleClient: Google | null = null;
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI) {
  googleClient = new Google(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  );
}

export async function generateGoogleAuthorizationUrl(): Promise<AuthorizationUrlResult> {
  if (!googleClient) {
    throw new Error("Google OAuth is not configured");
  }

  const state = generateRandomString();
  const codeVerifier = generateRandomString();
  const url = googleClient.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  return { url: url.toString(), state, codeVerifier };
}

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
): Promise<GoogleTokens> {
  if (!googleClient) {
    throw new Error("Google OAuth is not configured");
  }

  const tokens = await googleClient.validateAuthorizationCode(
    code,
    codeVerifier,
  );

  // Le refresh token n'est pas toujours présent (seulement lors de la première connexion)
  let refreshToken: string | undefined;
  try {
    refreshToken = tokens.refreshToken();
  } catch {
    // Pas de refresh token disponible, ce n'est pas grave pour l'authentification
    refreshToken = undefined;
  }

  return {
    accessToken: tokens.accessToken(),
    refreshToken,
    expiresIn: tokens.accessTokenExpiresAt().getTime() - Date.now(),
  };
}

export interface GoogleUserInfo {
  sub: string; // Google user ID
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export async function getGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Google user info: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}

// OAuth2 générique (existant)
export async function generateOAuth2AuthorizationUrl(): Promise<AuthorizationUrlResult> {
  if (
    !OAUTH_AUTHORIZATION_URL ||
    !OAUTH_TOKEN_URL ||
    !OAUTH_CLIENT_ID ||
    !OAUTH_CLIENT_SECRET ||
    !OAUTH_REDIRECT_URI
  ) {
    throw new Error(
      "OAuth2 is not configured. Missing environment variables: OAUTH_AUTHORIZATION_URL, OAUTH_TOKEN_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI",
    );
  }

  const codeVerifier = generateRandomString();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateRandomString();

  const authorizationUrl = new URL(OAUTH_AUTHORIZATION_URL);
  authorizationUrl.searchParams.set("client_id", OAUTH_CLIENT_ID);
  authorizationUrl.searchParams.set("redirect_uri", OAUTH_REDIRECT_URI);
  authorizationUrl.searchParams.set("response_type", "code");
  if (OAUTH_SCOPES) {
    authorizationUrl.searchParams.set("scope", OAUTH_SCOPES);
  }
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  return { url: authorizationUrl.toString(), codeVerifier, state };
}

interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export async function exchangeOAuth2Code(
  code: string,
  codeVerifier: string,
): Promise<string> {
  if (
    !OAUTH_TOKEN_URL ||
    !OAUTH_CLIENT_ID ||
    !OAUTH_CLIENT_SECRET ||
    !OAUTH_REDIRECT_URI
  ) {
    throw new Error("OAuth2 is not configured");
  }

  const tokenResponse = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: OAUTH_REDIRECT_URI,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(
      `Token exchange failed: ${tokenResponse.status} ${errorText}`,
    );
  }

  const tokens: OAuth2TokenResponse = await tokenResponse.json();
  return tokens.access_token;
}
