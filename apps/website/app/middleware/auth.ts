import { createContext, redirect, type RouterContext } from "react-router";
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
export async function sessionAuthMiddleware({
  request,
  context,
}: {
  request: Request;
  context: {
    set: <T>(ctx: RouterContext<T>, value: T) => void;
  };
}) {
  const user = await getUserFromSession(request);

  if (!user) {
    const url = new URL(request.url);
    throw redirect(
      `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`,
    );
  }

  context.set(userContext, user);
}

/**
 * Middleware that attempts to retrieve the session but does NOT redirect on null.
 * Sets maybeUserContext to the user or null.
 */
export async function optionalSessionAuthMiddleware({
  request,
  context,
}: {
  request: Request;
  context: {
    set: <T>(ctx: RouterContext<T>, value: T) => void;
  };
}) {
  const user = await getUserFromSession(request);
  context.set(maybeUserContext, user ?? null);
}

/**
 * Helper that asserts a nullable user is authenticated.
 * Throws a redirect to /auth/login if the user is null.
 */
export function requireUserFromContext(
  maybeUser: SessionData | null,
): SessionData {
  if (!maybeUser) {
    throw redirect("/auth/login");
  }
  return maybeUser;
}
