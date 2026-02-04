import { GitHub, Google, OAuth2Client } from "arctic";
import crypto from "node:crypto";

// Configuration OAuth2 générique (existant)
const MAPADO_AUTHORIZATION_URL = "https://oauth2.mapado.com/oauth/v2/auth";
const MAPADO_TOKEN_URL = "https://oauth2.mapado.com/oauth/v2/token";
const MAPADO_CLIENT_ID = process.env.MAPADO_CLIENT_ID;
const MAPADO_CLIENT_SECRET = process.env.MAPADO_CLIENT_SECRET;
const MAPADO_REDIRECT_URI = `${process.env.DOMAIN_ROOT}/auth/mapado/callback`;

// Configuration Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = `${process.env.DOMAIN_ROOT}/auth/google/callback`;

// Configuration GitHub OAuth
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = `${process.env.DOMAIN_ROOT}/auth/github/callback`;

export type OAuthProvider = "mapado" | "google" | "github";

export type ProviderConfig = {
  type: OAuthProvider;
  name: string;
  enabled: boolean;
};

export const AVAILABLE_PROVIDERS: Array<ProviderConfig> = [
  {
    type: "mapado",
    name: "Mapado",
    enabled: !!(MAPADO_CLIENT_ID && MAPADO_CLIENT_SECRET),
  },
  {
    type: "google",
    name: "Google",
    enabled: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
  },
  {
    type: "github",
    name: "GitHub",
    enabled: !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
  },
];

// Helpers pour générer code_verifier et state
function generateRandomString(length: number = 43): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

export type AuthorizationUrlResult = {
  url: string;
  codeVerifier?: string;
  state: string;
};

// Google OAuth
let googleClient: Google | null = null;
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  googleClient = new Google(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  );
}

// GitHub OAuth
let githubClient: GitHub | null = null;
if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  githubClient = new GitHub(
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    GITHUB_REDIRECT_URI,
  );
}

// Mapado OAuth (via OAuth2Client générique d'Arctic)
let mapadoClient: OAuth2Client | null = null;
if (MAPADO_CLIENT_ID && MAPADO_CLIENT_SECRET) {
  mapadoClient = new OAuth2Client(
    MAPADO_CLIENT_ID,
    MAPADO_CLIENT_SECRET,
    MAPADO_REDIRECT_URI,
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

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
};

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

export type GoogleUserInfo = {
  sub: string; // Google user ID
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

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
  if (!mapadoClient) {
    throw new Error(
      "Mapado OAuth is not configured. Missing environment variables: MAPADO_CLIENT_ID, MAPADO_CLIENT_SECRET",
    );
  }

  const state = generateRandomString();
  const codeVerifier = generateRandomString();

  // Créer l'URL d'autorisation avec PKCE
  const url = mapadoClient.createAuthorizationURLWithPKCE(
    MAPADO_AUTHORIZATION_URL,
    state,
    0, // CodeChallengeMethod.S256
    codeVerifier,
    [],
  );

  return { url: url.toString(), codeVerifier, state };
}

export async function exchangeMapadoCode(
  code: string,
  codeVerifier: string,
): Promise<string> {
  if (!mapadoClient) {
    throw new Error("Mapado OAuth is not configured");
  }

  const tokens = await mapadoClient.validateAuthorizationCode(
    MAPADO_TOKEN_URL,
    code,
    codeVerifier,
  );

  return tokens.accessToken();
}

// GitHub OAuth
export async function generateGithubAuthorizationUrl(): Promise<AuthorizationUrlResult> {
  if (!githubClient) {
    throw new Error("GitHub OAuth is not configured");
  }

  const state = generateRandomString();
  const url = githubClient.createAuthorizationURL(state, ["user:email"]);

  return { url: url.toString(), state };
}

export type GitHubTokens = {
  accessToken: string;
};

export async function exchangeGithubCode(code: string): Promise<GitHubTokens> {
  if (!githubClient) {
    throw new Error("GitHub OAuth is not configured");
  }

  const tokens = await githubClient.validateAuthorizationCode(code);

  return {
    accessToken: tokens.accessToken(),
  };
}

export type GitHubUserInfo = {
  id: number;
  login: string;
  email?: string | null;
  name?: string | null;
  avatar_url?: string;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
};

export async function getGithubUserInfo(
  accessToken: string,
): Promise<GitHubUserInfo> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch GitHub user info: ${response.status} ${response.statusText}`,
    );
  }

  const userInfo = await response.json();

  // Si l'email n'est pas public, on va le chercher via l'API emails
  if (!userInfo.email) {
    const emails = await getGithubUserEmails(accessToken);
    const primaryEmail = emails.find((e) => e.primary && e.verified);
    if (primaryEmail) {
      userInfo.email = primaryEmail.email;
    }
  }

  return userInfo;
}

async function getGithubUserEmails(
  accessToken: string,
): Promise<GitHubEmail[]> {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch GitHub user emails: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}
