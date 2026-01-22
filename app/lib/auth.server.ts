import { db, schema } from "./db.server";
import { eq, and } from "drizzle-orm";
import { createUserSession } from "./session.server";
import crypto from "node:crypto";

// Configuration OAuth2 depuis les variables d'environnement
const OAUTH_AUTHORIZATION_URL = process.env.OAUTH_AUTHORIZATION_URL;
const OAUTH_TOKEN_URL = process.env.OAUTH_TOKEN_URL;
const OAUTH_USERINFO_URL = process.env.OAUTH_USERINFO_URL;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;
const OAUTH_SCOPES = process.env.OAUTH_SCOPES || "";

if (
  !OAUTH_AUTHORIZATION_URL ||
  !OAUTH_TOKEN_URL ||
  !OAUTH_USERINFO_URL ||
  !OAUTH_CLIENT_ID ||
  !OAUTH_CLIENT_SECRET ||
  !OAUTH_REDIRECT_URI
) {
  throw new Error(
    "Missing OAuth2 environment variables: OAUTH_AUTHORIZATION_URL, OAUTH_TOKEN_URL, OAUTH_USERINFO_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI"
  );
}

// Helpers pour générer code_verifier et state
function generateRandomString(length: number = 43): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

function generateCodeChallenge(codeVerifier: string): string {
  return crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
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

interface UserInfo {
  "@id": string; // Ex: "/v1/users/919"
  "@type": string;
  "@context": string;
  firstname?: string;
  avatar?: string;
  email: string;
  fullName?: string;
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
    throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
  }

  const tokens: OAuth2TokenResponse = await tokenResponse.json();

  // Récupérer les informations utilisateur
  const userInfoResponse = await fetch(OAUTH_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: "application/json",
    },
  });

  if (!userInfoResponse.ok) {
    const errorText = await userInfoResponse.text();
    throw new Error(`User info fetch failed: ${userInfoResponse.status} ${errorText}`);
  }

  const userInfo: UserInfo = await userInfoResponse.json();

  if (!userInfo["@id"] || !userInfo.email) {
    throw new Error("Missing required user info: @id or email");
  }

  // Extraire l'ID numérique depuis l'IRI (ex: "/v1/users/919" -> "919")
  const userId = userInfo["@id"].split("/").pop();
  if (!userId) {
    throw new Error("Invalid user @id format");
  }

  // Créer ou mettre à jour l'utilisateur
  const user = await upsertUser({
    oauthProvider: "oauth2",
    oauthSubject: userId,
    email: userInfo.email,
    name: userInfo.fullName || userInfo.firstname,
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
      eq(schema.users.oauthSubject, params.oauthSubject)
    ),
  });

  if (existingUser) {
    // Mettre à jour l'utilisateur
    await db
      .update(schema.users)
      .set({
        email: params.email,
        name: params.name,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existingUser.id));

    return {
      id: existingUser.id,
      email: params.email,
      name: params.name,
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
    name: params.name,
  };
}

export async function exchangeCodeForUser(
  code: string,
  state: string,
  codeVerifier: string,
  expectedState: string,
  redirectTo: string = "/"
) {
  const user = await handleCallback({
    code,
    state,
    codeVerifier,
    expectedState,
  });

  return createUserSession(user.id, user.email, user.name, redirectTo);
}
