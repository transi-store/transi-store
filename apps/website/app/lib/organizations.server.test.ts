import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../../drizzle/schema";
import {
  cleanupDb,
  createOrganization,
  getTestDb,
  type TestDb,
} from "../../tests/test-db";
import {
  getOrganizationBySlug,
  isUserMemberOfOrganization,
} from "./organizations.server";
import type { OAuthProvider } from "~/lib/auth-providers";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

describe("organizations.server", () => {
  let db: TestDb;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();
  });

  describe("getOrganizationBySlug", () => {
    it("returns undefined when no organization exists with that slug", async () => {
      const result = await getOrganizationBySlug("nonexistent");
      expect(result).toBeUndefined();
    });

    it("returns the organization when the slug matches", async () => {
      const org = await createOrganization(db, { slug: "my-org" });
      const result = await getOrganizationBySlug("my-org");
      expect(result).not.toBeUndefined();
      expect(result!.id).toBe(org.id);
      expect(result!.slug).toBe("my-org");
    });

    it("does not return an organization with a different slug", async () => {
      await createOrganization(db, { slug: "org-a" });
      const result = await getOrganizationBySlug("org-b");
      expect(result).toBeUndefined();
    });
  });

  describe("isUserMemberOfOrganization", () => {
    it("returns false when the user is not a member", async () => {
      const org = await createOrganization(db);
      const result = await isUserMemberOfOrganization(9999, org.id);
      expect(result).toBe(false);
    });

    it("returns true when the user is a member", async () => {
      const org = await createOrganization(db);

      const [user] = await db
        .insert(schema.users)
        .values({
          email: "member@example.com",
          name: "Member User",
          oauthProvider: "test" as OAuthProvider,
          oauthSubject: "test-subject-member",
        })
        .returning();

      await db.insert(schema.organizationMembers).values({
        userId: user.id,
        organizationId: org.id,
      });

      const result = await isUserMemberOfOrganization(user.id, org.id);
      expect(result).toBe(true);
    });

    it("returns false when the user is a member of another organization", async () => {
      const org1 = await createOrganization(db, { slug: "org-1" });
      const org2 = await createOrganization(db, { slug: "org-2" });

      const [user] = await db
        .insert(schema.users)
        .values({
          email: "member2@example.com",
          name: "Member 2",
          oauthProvider: "test" as OAuthProvider,
          oauthSubject: "test-subject-member2",
        })
        .returning();

      await db.insert(schema.organizationMembers).values({
        userId: user.id,
        organizationId: org1.id,
      });

      const result = await isUserMemberOfOrganization(user.id, org2.id);
      expect(result).toBe(false);
    });
  });
});
