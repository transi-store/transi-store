import { createContext, redirect, type MiddlewareFunction } from "react-router";
import { getUserFromSession, type SessionData } from "~/lib/session.server";

/**
 * Context that holds the authenticated user session data.
 * Set by the session auth middleware in app-layout.
 */
export const userContext = createContext<SessionData>();

/**
 * Context that holds the authenticated user session data, or null if not authenticated.
 * Set by the optional session auth middleware in project-viewer-layout.
 */
export const maybeUserContext = createContext<SessionData | null>();

/**
 * Middleware that requires a valid user session.
 * Redirects to /auth/login if the user is not authenticated.
 */
export const sessionAuthMiddleware: MiddlewareFunction = async ({
  request,
  context,
}) => {
  const user = await getUserFromSession(request);

  if (!user) {
    const url = new URL(request.url);
    throw redirect(
      `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`,
    );
  }

  context.set(userContext, user);
};

/**
 * Middleware that attempts to retrieve the session but does NOT redirect on null.
 * Sets maybeUserContext to the user or null.
 */
export const optionalSessionAuthMiddleware: MiddlewareFunction = async ({
  request,
  context,
}) => {
  const user = await getUserFromSession(request);
  context.set(maybeUserContext, user ?? null);
};

/**
 * Helper that asserts a nullable user is authenticated.
 * Throws a redirect to /auth/login if the user is null.
 * Pass `request` to preserve the current URL in a `redirectTo` query parameter.
 */
export function requireUserFromContext(
  maybeUser: SessionData | null,
  request?: Request,
): SessionData {
  if (!maybeUser) {
    if (request) {
      const url = new URL(request.url);
      throw redirect(
        `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`,
      );
    }
    throw redirect("/auth/login");
  }
  return maybeUser;
}
