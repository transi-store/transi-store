import { createContext } from "react-router";
import { getUserFromSession, type SessionData } from "~/lib/session.server";
import {
  getOrganizationByApiKey,
  updateApiKeyLastUsed,
} from "~/lib/api-keys.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import type { MiddlewareFunction } from "react-router";
import { apiError } from "~/lib/api-response.server";

enum AuthMode {
  Session = "session",
  ApiKey = "apiKey",
}

type ApiAuthResult =
  | { mode: AuthMode.Session; user: SessionData; organization?: undefined }
  | {
      mode: AuthMode.ApiKey;
      user?: undefined;
      organization: { id: number; slug: string; name: string };
    };

type ApiOrganization = { id: number; slug: string; name: string };

/**
 * Context that holds the API authentication result.
 * Set by the API auth middleware in api-layout.
 */
const apiAuthContext = createContext<ApiAuthResult>();

/**
 * Context that holds the resolved organization after org-slug validation.
 * Set by apiOrgMiddleware on individual API routes.
 */
export const orgContext = createContext<ApiOrganization>();

/**
 * Middleware that accepts dual authentication: Bearer API key or session cookie.
 * - If Bearer token is present and valid → sets apiKey mode with organization
 * - If session cookie is valid → sets session mode with user
 * - Otherwise → returns 403 JSON error
 */
export const apiAuthMiddleware: MiddlewareFunction = async ({
  request,
  context,
}) => {
  const authHeader = request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const org = await getOrganizationByApiKey(apiKey);

    if (!org) {
      throw apiError(401, "Invalid API key");
    }

    updateApiKeyLastUsed(apiKey).catch((err) => {
      console.error("Failed to update API key last used:", err);
    });

    context.set(apiAuthContext, { mode: AuthMode.ApiKey, organization: org });
    return;
  }

  // Fallback to session auth
  const user = await getUserFromSession(request);

  if (!user) {
    throw apiError(403, "Unauthorized");
  }

  context.set(apiAuthContext, { mode: AuthMode.Session, user });
};

/**
 * Middleware for individual API routes that validates org-slug access.
 * Resolves the organization from the API key (validating slug matches)
 * or from the session (checking membership), then sets orgContext.
 *
 * Requires apiAuthMiddleware to have run first (via api-layout).
 */
export const apiOrgMiddleware: MiddlewareFunction = async ({
  params,
  context,
}) => {
  const auth = context.get(apiAuthContext);

  if (!params.orgSlug) {
    throw apiError(400, "Organization slug is required");
  }

  if (auth.mode === AuthMode.ApiKey) {
    if (auth.organization.slug !== params.orgSlug) {
      throw apiError(403, "API key does not match organization");
    }
    context.set(orgContext, auth.organization);
    return;
  }

  const organization = await requireOrganizationMembership(
    auth.user,
    params.orgSlug,
  );
  context.set(orgContext, organization);
};
