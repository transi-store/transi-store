import { db, schema } from "./db.server";
import { eq } from "drizzle-orm";
import { createUserSession } from "./session.server";
import { decodeJwt } from "jose";
import {
  type OAuthProvider,
  generateMapadoAuthorizationUrl,
  exchangeMapadoCode,
  exchangeGoogleCode,
  getGoogleUserInfo,
  type AuthorizationUrlResult,
} from "./auth-providers.server";

export type { OAuthProvider, AuthorizationUrlResult };

// Pour compatibilité avec le code existant - Mapado OAuth
export async function generateAuthorizationUrl(): Promise<AuthorizationUrlResult> {
  return generateMapadoAuthorizationUrl();
}

export interface CallbackParams {
  code: string;
  state: string;
  codeVerifier?: string;
  expectedState: string;
  provider: OAuthProvider;
}

interface OAuth2JWTPayload {
  sub: string; // User ID (requis)
  email?: string; // Email (optionnel dans JWT)
}

export async function handleCallback(params: CallbackParams) {
  // Vérifier que le state correspond
  if (params.state !== params.expectedState) {
    throw new Error("State mismatch");
  }

  if (params.provider === "google") {
    return handleGoogleCallback(params);
  } else if (params.provider === "mapado") {
    return handleMapadoCallback(params);
  }

  throw new Error(`Unknown OAuth provider: ${params.provider}`);
}

async function handleGoogleCallback(params: CallbackParams) {
  if (!params.codeVerifier) {
    throw new Error("Code verifier is required for Google OAuth");
  }

  // Échanger le code contre un access token
  const tokens = await exchangeGoogleCode(params.code, params.codeVerifier);

  // Récupérer les infos utilisateur depuis Google
  const userInfo = await getGoogleUserInfo(tokens.accessToken);

  if (!userInfo.sub) {
    throw new Error("Missing user ID from Google");
  }

  // Créer ou mettre à jour l'utilisateur
  const user = await upsertUser({
    oauthProvider: "google",
    oauthSubject: userInfo.sub,
    email: userInfo.email || `user-${userInfo.sub}@google.com`,
    name: userInfo.name || userInfo.given_name,
  });

  return user;
}

async function handleMapadoCallback(params: CallbackParams) {
  if (!params.codeVerifier) {
    throw new Error("Code verifier is required for Mapado OAuth");
  }

  // Échanger le code contre un access token
  const accessToken = await exchangeMapadoCode(
    params.code,
    params.codeVerifier,
  );

  // Décoder le JWT pour extraire l'id utilisateur
  let decodedToken: OAuth2JWTPayload;
  try {
    decodedToken = decodeJwt(accessToken) as OAuth2JWTPayload;
    if (!decodedToken.sub) {
      throw new Error("Missing sub claim in JWT");
    }
  } catch (error) {
    throw new Error("Failed to decode JWT token");
  }

  // Créer ou mettre à jour l'utilisateur (sans name)
  const user = await upsertUser({
    oauthProvider: "mapado",
    oauthSubject: decodedToken.sub,
    email: decodedToken.email || `user-${decodedToken.sub}@unknown.local`,
    name: undefined,
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
    where: {
      oauthProvider: params.oauthProvider,
      oauthSubject: params.oauthSubject,
    },
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
  const [newUser] = await db
    .insert(schema.users)
    .values({
      oauthProvider: params.oauthProvider,
      oauthSubject: params.oauthSubject,
      email: params.email,
      name: params.name,
    })
    .returning();

  return {
    id: newUser.id,
    email: params.email,
    name: params.name, // Pour nouveau user, retourner le name du param (undefined si nouveau)
  };
}

export async function exchangeCodeForUser(
  code: string,
  state: string,
  codeVerifier: string | undefined,
  expectedState: string,
  redirectTo: string = "/",
  provider: OAuthProvider = "mapado",
) {
  const user = await handleCallback({
    code,
    state,
    codeVerifier,
    expectedState,
    provider,
  });

  // Rediriger vers complete-profile si pas de name
  if (!user.name) {
    const params = new URLSearchParams({ redirectTo });
    // Créer la session même sans name pour que l'utilisateur soit authentifié
    return createUserSession(
      user.id,
      user.email,
      undefined,
      `/auth/complete-profile?${params}`,
    );
  }

  return createUserSession(user.id, user.email, user.name, redirectTo);
}

export async function getUserById(userId: number) {
  return await db.query.users.findFirst({
    where: { id: userId },
  });
}

export async function updateUserName(userId: number, name: string) {
  await db
    .update(schema.users)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));
}
