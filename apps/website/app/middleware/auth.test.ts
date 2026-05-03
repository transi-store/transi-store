import { describe, expect, it } from "vitest";
import { requireUserFromContext } from "./auth";
import type { SessionData } from "~/lib/session.server";

describe("requireUserFromContext", () => {
  it("returns the user when a session is present", () => {
    const user: SessionData = { userId: 1, email: "test@example.com" };
    expect(requireUserFromContext(user)).toBe(user);
  });

  it("throws a redirect to /auth/login when user is null", () => {
    expect(() => requireUserFromContext(null)).toThrow();
    try {
      requireUserFromContext(null);
    } catch (e) {
      const response = e as Response;
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/login");
    }
  });
});
