import { Google, OAuth2Client } from "arctic";
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

// Mapado OAuth (via OAuth2Client générique d'Arctic)
let mapadoClient: OAuth2Client | null = null;
if (
  OAUTH_AUTHORIZATION_URL &&
  OAUTH_TOKEN_URL &&
  OAUTH_CLIENT_ID &&
  OAUTH_CLIENT_SECRET &&
  OAUTH_REDIRECT_URI
) {
  mapadoClient = new OAuth2Client(
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    OAUTH_REDIRECT_URI,
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

// Mapado OAuth (OAuth2 avec JWT)
export async function generateMapadoAuthorizationUrl(): Promise<AuthorizationUrlResult> {
  if (!mapadoClient || !OAUTH_AUTHORIZATION_URL) {
    throw new Error(
      "Mapado OAuth is not configured. Missing environment variables: OAUTH_AUTHORIZATION_URL, OAUTH_TOKEN_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI",
    );
  }

  const state = generateRandomString();
  const codeVerifier = generateRandomString();

  // Créer l'URL d'autorisation avec PKCE
  const scopes = OAUTH_SCOPES ? OAUTH_SCOPES.split(" ") : [];
  const url = mapadoClient.createAuthorizationURLWithPKCE(
    OAUTH_AUTHORIZATION_URL,
    state,
    0, // CodeChallengeMethod.S256
    codeVerifier,
    scopes,
  );

  return { url: url.toString(), codeVerifier, state };
}

export async function exchangeMapadoCode(
  code: string,
  codeVerifier: string,
): Promise<string> {
  if (!mapadoClient || !OAUTH_TOKEN_URL) {
    throw new Error("Mapado OAuth is not configured");
  }

  const tokens = await mapadoClient.validateAuthorizationCode(
    OAUTH_TOKEN_URL,
    code,
    codeVerifier,
  );

  return tokens.accessToken();
}
