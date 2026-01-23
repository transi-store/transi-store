import { db, schema } from "./db.server";
import { eq, and } from "drizzle-orm";
import { createUserSession } from "./session.server";
import crypto from "node:crypto";
import { decodeJwt } from "jose";

// Configuration OAuth2 depuis les variables d'environnement
const OAUTH_AUTHORIZATION_URL = process.env.OAUTH_AUTHORIZATION_URL;
const OAUTH_TOKEN_URL = process.env.OAUTH_TOKEN_URL;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;
const OAUTH_SCOPES = process.env.OAUTH_SCOPES || "";

if (
  !OAUTH_AUTHORIZATION_URL ||
  !OAUTH_TOKEN_URL ||
  !OAUTH_CLIENT_ID ||
  !OAUTH_CLIENT_SECRET ||
  !OAUTH_REDIRECT_URI
) {
  throw new Error(
    "Missing OAuth2 environment variables: OAUTH_AUTHORIZATION_URL, OAUTH_TOKEN_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI",
  );
}

// Helpers pour générer code_verifier et state
function generateRandomString(length: number = 43): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

export interface AuthorizationUrlResult {
  url: string;
  codeVerifier: string;
  state: string;
}

export async function generateAuthorizationUrl(): Promise<AuthorizationUrlResult> {
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

export interface CallbackParams {
  code: string;
  state: string;
  codeVerifier: string;
  expectedState: string;
}

interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

interface JWTPayload {
  sub: string;      // User ID (requis)
  email?: string;   // Email (optionnel dans JWT)
}

export async function handleCallback(params: CallbackParams) {
  // Vérifier que le state correspond
  if (params.state !== params.expectedState) {
    throw new Error("State mismatch");
  }

  // Échanger le code contre un access token
  const tokenResponse = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: OAUTH_REDIRECT_URI,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      code_verifier: params.codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(
      `Token exchange failed: ${tokenResponse.status} ${errorText}`,
    );
  }

  const tokens: OAuth2TokenResponse = await tokenResponse.json();

  // Décoder le JWT pour extraire l'id utilisateur
  let decodedToken: JWTPayload;
  try {
    decodedToken = decodeJwt(tokens.access_token) as JWTPayload;
    if (!decodedToken.sub) {
      throw new Error("Missing sub claim in JWT");
    }
  } catch (error) {
    throw new Error("Failed to decode JWT token");
  }

  // Créer ou mettre à jour l'utilisateur (sans name)
  const user = await upsertUser({
    oauthProvider: "oauth2",
    oauthSubject: decodedToken.sub,
    email: decodedToken.email || `user-${decodedToken.sub}@unknown.local`, // Fallback si pas d'email
    name: undefined, // Pas de name depuis JWT
  });

  return user;
}

interface UpsertUserParams {
  oauthProvider: string;
  oauthSubject: string;
  email: string;
  name?: string;
}

async function upsertUser(params: UpsertUserParams) {
  // Chercher l'utilisateur existant
  const existingUser = await db.query.users.findFirst({
    where: and(
      eq(schema.users.oauthProvider, params.oauthProvider),
      eq(schema.users.oauthSubject, params.oauthSubject),
    ),
  });

  if (existingUser) {
    // Mettre à jour l'utilisateur (ne pas écraser le name existant)
    await db
      .update(schema.users)
      .set({
        email: params.email,
        // On ne met pas à jour le name ici - on garde le name existant
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existingUser.id));

    return {
      id: existingUser.id,
      email: params.email,
      name: existingUser.name, // Retourner le name existant
    };
  }

  // Créer un nouvel utilisateur
  const userId = crypto.randomUUID();
  await db.insert(schema.users).values({
    id: userId,
    oauthProvider: params.oauthProvider,
    oauthSubject: params.oauthSubject,
    email: params.email,
    name: params.name,
  });

  return {
    id: userId,
    email: params.email,
    name: params.name, // Pour nouveau user, retourner le name du param (undefined si nouveau)
  };
}

export async function exchangeCodeForUser(
  code: string,
  state: string,
  codeVerifier: string,
  expectedState: string,
  redirectTo: string = "/",
) {
  const user = await handleCallback({
    code,
    state,
    codeVerifier,
    expectedState,
  });

  // Rediriger vers complete-profile si pas de name
  if (!user.name) {
    const params = new URLSearchParams({ redirectTo });
    // Créer la session même sans name pour que l'utilisateur soit authentifié
    return createUserSession(user.id, user.email, undefined, `/auth/complete-profile?${params}`);
  }

  return createUserSession(user.id, user.email, user.name, redirectTo);
}

export async function getUserById(userId: string) {
  return await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });
}

export async function updateUserName(userId: string, name: string) {
  await db
    .update(schema.users)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));
}
