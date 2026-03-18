import { createContext, redirect, type RouterContext } from "react-router";
import { getUserFromSession, type SessionData } from "~/lib/session.server";

/**
 * Context that holds the authenticated user session data.
 * Set by the session auth middleware in app-layout.
 */
export const userContext = createContext<SessionData>();

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
