import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../../drizzle/schema";
import { cleanupDb, getTestDb, type TestDb } from "../../tests/test-db";
import { OAuthProvider } from "./auth-providers";

const {
  emitAppEventMock,
  exchangeGoogleCodeMock,
  getGoogleUserInfoMock,
  createUserSessionMock,
} = vi.hoisted(() => ({
  emitAppEventMock: vi.fn(),
  exchangeGoogleCodeMock: vi.fn(),
  getGoogleUserInfoMock: vi.fn(),
  createUserSessionMock: vi.fn(),
}));

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

vi.mock("~/lib/events.server", () => ({
  emitAppEvent: emitAppEventMock,
}));

vi.mock("~/lib/auth-providers.server", () => ({
  exchangeGoogleCode: exchangeGoogleCodeMock,
  getGoogleUserInfo: getGoogleUserInfoMock,
  exchangeMapadoCode: vi.fn(),
  exchangeGithubCode: vi.fn(),
  getGithubUserInfo: vi.fn(),
}));

vi.mock("~/lib/session.server", () => ({
  createUserSession: createUserSessionMock,
}));

import { exchangeCodeForUser } from "./auth.server";

describe("auth.server", () => {
  let db: TestDb;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();

    vi.clearAllMocks();
    exchangeGoogleCodeMock.mockResolvedValue({
      accessToken: "access-token",
      expiresIn: 3600,
    });
    getGoogleUserInfoMock.mockResolvedValue({
      sub: "google-subject-1",
      email: "new-user@example.com",
      name: "New User",
    });
    createUserSessionMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location: "/",
        },
      }),
    );
  });

  it("emits user.joined_platform when a new user is created", async () => {
    await exchangeCodeForUser(
      "oauth-code",
      "oauth-state",
      "verifier",
      "oauth-state",
      "/",
      OAuthProvider.GOOGLE,
    );

    expect(emitAppEventMock).toHaveBeenCalledTimes(1);
    expect(emitAppEventMock).toHaveBeenCalledWith("user.joined_platform", {
      userId: 1,
      email: "new-user@example.com",
      name: "New User",
      oauthProvider: OAuthProvider.GOOGLE,
    });
  });

  it("does not emit user.joined_platform when an existing user logs in", async () => {
    await db.insert(schema.users).values({
      email: "existing-user@example.com",
      name: "Existing User",
      oauthProvider: OAuthProvider.GOOGLE,
      oauthSubject: "google-subject-1",
    });

    await exchangeCodeForUser(
      "oauth-code",
      "oauth-state",
      "verifier",
      "oauth-state",
      "/",
      OAuthProvider.GOOGLE,
    );

    expect(emitAppEventMock).not.toHaveBeenCalled();
  });
});
