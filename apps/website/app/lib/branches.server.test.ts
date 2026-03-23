import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import {
  getTestDb,
  cleanupDb,
  createOrganization,
  createProject,
  createBranch,
  createTranslationKey,
  type TestDb,
} from "../../tests/test-db";
import {
  addKeyDeletionsToBranch,
  removeKeyDeletionFromBranch,
  getBranchKeyDeletions,
  getBranchKeyDeletionCount,
  searchMainKeysForDeletion,
  mergeBranch,
  getBranchKeys,
} from "./branches.server";
import { BRANCH_STATUS } from "./branches";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

Date.now = () => 1_767_268_800_000; // Mock current date to Jan 1, 2026

describe("Branch Key Deletions", () => {
  let db: TestDb;
  let projectId: number;
  let branchId: number;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();
    const org = await createOrganization(db);
    const project = await createProject(db, org.id);
    projectId = project.id;
    const branch = await createBranch(db, projectId);
    branchId = branch.id;
  });

  describe("addKeyDeletionsToBranch", () => {
    it("marks main keys for deletion in a branch", async () => {
      const key1 = await createTranslationKey(db, projectId, "key.one");
      const key2 = await createTranslationKey(db, projectId, "key.two");

      await addKeyDeletionsToBranch(branchId, [key1.id, key2.id]);

      const count = await getBranchKeyDeletionCount(branchId);
      expect(count).toBe(2);
    });

    it("does nothing when given an empty array", async () => {
      await addKeyDeletionsToBranch(branchId, []);

      const count = await getBranchKeyDeletionCount(branchId);
      expect(count).toBe(0);
    });

    it("ignores duplicates (onConflictDoNothing)", async () => {
      const key = await createTranslationKey(db, projectId, "key.one");

      await addKeyDeletionsToBranch(branchId, [key.id]);
      await addKeyDeletionsToBranch(branchId, [key.id]);

      const count = await getBranchKeyDeletionCount(branchId);
      expect(count).toBe(1);
    });
  });

  describe("removeKeyDeletionFromBranch", () => {
    it("removes a key from the deletion list", async () => {
      const key1 = await createTranslationKey(db, projectId, "key.one");
      const key2 = await createTranslationKey(db, projectId, "key.two");
      await addKeyDeletionsToBranch(branchId, [key1.id, key2.id]);

      await removeKeyDeletionFromBranch(branchId, key1.id);

      const deletions = await getBranchKeyDeletions(branchId);
      expect(deletions).toHaveLength(1);
      expect(deletions[0].keyName).toBe("key.two");
    });

    it("does nothing when key is not in the deletion list", async () => {
      const key = await createTranslationKey(db, projectId, "key.one");
      await addKeyDeletionsToBranch(branchId, [key.id]);

      await removeKeyDeletionFromBranch(branchId, 9999);

      const count = await getBranchKeyDeletionCount(branchId);
      expect(count).toBe(1);
    });
  });

  describe("getBranchKeyDeletions", () => {
    it("returns empty array when no deletions", async () => {
      const deletions = await getBranchKeyDeletions(branchId);
      expect(deletions).toEqual([]);
    });

    it("returns marked keys sorted by keyName", async () => {
      const keyZ = await createTranslationKey(db, projectId, "zebra");
      const keyA = await createTranslationKey(db, projectId, "apple");
      await addKeyDeletionsToBranch(branchId, [keyZ.id, keyA.id]);

      const deletions = await getBranchKeyDeletions(branchId);

      expect(deletions).toHaveLength(2);
      expect(deletions.map((d) => d.keyName)).toEqual(["apple", "zebra"]);
    });
  });

  describe("getBranchKeyDeletionCount", () => {
    it("returns 0 when no deletions", async () => {
      const count = await getBranchKeyDeletionCount(branchId);
      expect(count).toBe(0);
    });

    it("returns correct count", async () => {
      const key1 = await createTranslationKey(db, projectId, "k1");
      const key2 = await createTranslationKey(db, projectId, "k2");
      const key3 = await createTranslationKey(db, projectId, "k3");
      await addKeyDeletionsToBranch(branchId, [key1.id, key2.id, key3.id]);

      const count = await getBranchKeyDeletionCount(branchId);
      expect(count).toBe(3);
    });
  });

  describe("searchMainKeysForDeletion", () => {
    it("returns main keys only (not branch keys)", async () => {
      await createTranslationKey(db, projectId, "main.key");
      await createTranslationKey(db, projectId, "branch.key", {
        branchId,
      });

      const result = await searchMainKeysForDeletion(projectId, branchId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].keyName).toBe("main.key");
      expect(result.count).toBe(1);
    });

    it("excludes already-marked keys", async () => {
      await createTranslationKey(db, projectId, "keep.me");
      const key2 = await createTranslationKey(db, projectId, "marked.key");
      await addKeyDeletionsToBranch(branchId, [key2.id]);

      const result = await searchMainKeysForDeletion(projectId, branchId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].keyName).toBe("keep.me");
    });

    it("excludes soft-deleted keys", async () => {
      await createTranslationKey(db, projectId, "alive.key");
      await createTranslationKey(db, projectId, "deleted.key", {
        deletedAt: new Date(),
      });

      const result = await searchMainKeysForDeletion(projectId, branchId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].keyName).toBe("alive.key");
    });

    it("respects limit and offset", async () => {
      await createTranslationKey(db, projectId, "a");
      await createTranslationKey(db, projectId, "b");
      await createTranslationKey(db, projectId, "c");

      const page1 = await searchMainKeysForDeletion(projectId, branchId, {
        limit: 2,
        offset: 0,
      });
      const page2 = await searchMainKeysForDeletion(projectId, branchId, {
        limit: 2,
        offset: 2,
      });

      expect(page1.data).toHaveLength(2);
      expect(page1.count).toBe(3);
      expect(page2.data).toHaveLength(1);
    });

    it("returns empty when no main keys exist", async () => {
      const result = await searchMainKeysForDeletion(projectId, branchId);

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });
});

describe("mergeBranch with deletions", () => {
  let db: TestDb;
  let projectId: number;
  let branchId: number;
  let userId: number;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();

    const org = await createOrganization(db);
    const project = await createProject(db, org.id);
    projectId = project.id;
    const branch = await createBranch(db, projectId);
    branchId = branch.id;

    const [user] = await db
      .insert(schema.users)
      .values({
        email: "merge-user@test.com",
        name: "Merge User",
        oauthProvider: "test",
        oauthSubject: "merge-user",
      })
      .returning();
    userId = user.id;
  });

  it("soft-deletes keys marked for deletion", async () => {
    const key = await createTranslationKey(db, projectId, "to.delete");
    await addKeyDeletionsToBranch(branchId, [key.id]);

    const result = await mergeBranch(branchId, userId);

    expect(result).toEqual({
      success: true,
      keysMoved: 0,
      keysDeleted: 1,
    });

    // Verify key has deletedAt set
    const [updatedKey] = await db
      .select()
      .from(schema.translationKeys)
      .where(eq(schema.translationKeys.id, key.id));
    expect(updatedKey.deletedAt).not.toBeNull();
  });

  it("cleans up branchKeyDeletions after merge", async () => {
    const key = await createTranslationKey(db, projectId, "to.delete");
    await addKeyDeletionsToBranch(branchId, [key.id]);

    await mergeBranch(branchId, userId);

    const count = await getBranchKeyDeletionCount(branchId);
    expect(count).toBe(0);
  });

  it("handles both additions and deletions in the same merge", async () => {
    // Main key to delete
    const mainKey = await createTranslationKey(db, projectId, "old.key");
    await addKeyDeletionsToBranch(branchId, [mainKey.id]);

    // Branch key to move to main
    await createTranslationKey(db, projectId, "new.key", { branchId });

    const result = await mergeBranch(branchId, userId);

    expect(result).toEqual({
      success: true,
      keysMoved: 1,
      keysDeleted: 1,
    });

    // The new key is now on main
    const branchKeys = await getBranchKeys(branchId);
    expect(branchKeys).toHaveLength(0);

    // The old key is soft-deleted
    const [deletedKey] = await db
      .select()
      .from(schema.translationKeys)
      .where(eq(schema.translationKeys.id, mainKey.id));
    expect(deletedKey.deletedAt).not.toBeNull();
  });

  it("sets branch status to merged", async () => {
    await mergeBranch(branchId, userId);

    const branch = await db.query.branches.findFirst({
      where: { id: branchId },
    });
    expect(branch!.status).toBe(BRANCH_STATUS.MERGED);
  });

  it("fails when branch is already merged", async () => {
    await mergeBranch(branchId, userId);

    const result = await mergeBranch(branchId, userId);

    expect(result).toEqual({
      success: false,
      error: "Branch is not open",
    });
  });

  it("fails when branch does not exist", async () => {
    const result = await mergeBranch(9999, userId);

    expect(result).toEqual({
      success: false,
      error: "Branch not found",
    });
  });
});
