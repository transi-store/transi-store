import { createCookieSessionStorage } from "react-router";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is not set");
}

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

export interface SessionData {
  userId: string;
  email: string;
  name?: string;
}

export async function createUserSession(
  userId: string,
  email: string,
  name: string | undefined,
  redirectTo: string
) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  session.set("email", email);
  if (name) {
    session.set("name", name);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function getUserSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserFromSession(
  request: Request
): Promise<SessionData | null> {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  const email = session.get("email");
  const name = session.get("name");

  if (!userId || !email) {
    return null;
  }

  return { userId, email, name };
}

export async function requireUser(request: Request): Promise<SessionData> {
  const user = await getUserFromSession(request);
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
