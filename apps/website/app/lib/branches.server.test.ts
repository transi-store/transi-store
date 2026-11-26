import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { SupportedFormat } from "@transi-store/common";
import * as schema from "../../drizzle/schema";
import {
  getTestDb,
  cleanupDb,
  createOrganization,
  createProject,
  createProjectFile,
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
  getBranchKeyCount,
} from "./branches.server";
import { BRANCH_STATUS, MERGE_FAILURE_REASON } from "./branches";
import type { OAuthProvider } from "./auth-providers";

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
  let fileId: number;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();
    const org = await createOrganization(db);
    const project = await createProject(db, org.id);
    projectId = project.id;
    const file = await createProjectFile(db, {
      projectId,
      format: SupportedFormat.JSON,
      filePath: "locales/<lang>/common.json",
    });
    fileId = file.id;
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

      const result = await searchMainKeysForDeletion(
        projectId,
        branchId,
        fileId,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].keyName).toBe("main.key");
      expect(result.count).toBe(1);
    });

    it("excludes already-marked keys", async () => {
      await createTranslationKey(db, projectId, "keep.me");
      const key2 = await createTranslationKey(db, projectId, "marked.key");
      await addKeyDeletionsToBranch(branchId, [key2.id]);

      const result = await searchMainKeysForDeletion(
        projectId,
        branchId,
        fileId,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].keyName).toBe("keep.me");
    });

    it("excludes soft-deleted keys", async () => {
      await createTranslationKey(db, projectId, "alive.key");
      await createTranslationKey(db, projectId, "deleted.key", {
        deletedAt: new Date(),
      });

      const result = await searchMainKeysForDeletion(
        projectId,
        branchId,
        fileId,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].keyName).toBe("alive.key");
    });

    it("respects limit and offset", async () => {
      await createTranslationKey(db, projectId, "a");
      await createTranslationKey(db, projectId, "b");
      await createTranslationKey(db, projectId, "c");

      const page1 = await searchMainKeysForDeletion(
        projectId,
        branchId,
        fileId,
        {
          limit: 2,
          offset: 0,
        },
      );
      const page2 = await searchMainKeysForDeletion(
        projectId,
        branchId,
        fileId,
        {
          limit: 2,
          offset: 2,
        },
      );

      expect(page1.data).toHaveLength(2);
      expect(page1.count).toBe(3);
      expect(page2.data).toHaveLength(1);
    });

    it("returns empty when no main keys exist", async () => {
      const result = await searchMainKeysForDeletion(
        projectId,
        branchId,
        fileId,
      );

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });

    it("only returns keys from the given file", async () => {
      const otherFile = await createProjectFile(db, {
        projectId,
        format: SupportedFormat.JSON,
        filePath: "locales/<lang>/other.json",
      });
      await createTranslationKey(db, projectId, "file-one.key", { fileId });
      await createTranslationKey(db, projectId, "file-two.key", {
        fileId: otherFile.id,
      });

      const result = await searchMainKeysForDeletion(
        projectId,
        branchId,
        fileId,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].keyName).toBe("file-one.key");
    });

    it("orders search results by relevance, not alphabetically", async () => {
      // "welcom" sorts before "welcome" alphabetically, but "welcome" is the
      // closer match to the query and must therefore come first.
      await createTranslationKey(db, projectId, "welcom");
      await createTranslationKey(db, projectId, "welcome");

      const result = await searchMainKeysForDeletion(
        projectId,
        branchId,
        fileId,
        { search: "welcome" },
      );

      expect(result.data.map((d) => d.keyName)).toEqual(["welcome", "welcom"]);
    });
  });

  describe("getBranchKeyDeletions / getBranchKeyDeletionCount with fileId", () => {
    it("scopes deletions to the given fileId", async () => {
      const otherFile = await createProjectFile(db, {
        projectId,
        format: SupportedFormat.JSON,
        filePath: "locales/<lang>/other.json",
      });
      const keyA = await createTranslationKey(db, projectId, "a", { fileId });
      const keyB = await createTranslationKey(db, projectId, "b", {
        fileId: otherFile.id,
      });
      await addKeyDeletionsToBranch(branchId, [keyA.id, keyB.id]);

      const scoped = await getBranchKeyDeletions(branchId, { fileId });
      expect(scoped).toHaveLength(1);
      expect(scoped[0].keyName).toBe("a");
      expect(scoped[0].filePath).toBe("locales/<lang>/common.json");

      const scopedCount = await getBranchKeyDeletionCount(branchId, { fileId });
      expect(scopedCount).toBe(1);

      const allCount = await getBranchKeyDeletionCount(branchId);
      expect(allCount).toBe(2);
    });

    it("returns filePath on each deleted key", async () => {
      const key = await createTranslationKey(db, projectId, "k");
      await addKeyDeletionsToBranch(branchId, [key.id]);

      const deletions = await getBranchKeyDeletions(branchId);

      expect(deletions).toHaveLength(1);
      expect(deletions[0].filePath).toBe("locales/<lang>/common.json");
    });
  });

  describe("getBranchKeys returns filePath", () => {
    it("includes filePath on each key", async () => {
      await createTranslationKey(db, projectId, "branch.key", {
        branchId,
        fileId,
      });

      const keys = await getBranchKeys(branchId);

      expect(keys).toHaveLength(1);
      expect(keys[0].filePath).toBe("locales/<lang>/common.json");
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
        oauthProvider: "test" as OAuthProvider, // Cast to OAuthProvider to satisfy type, even though "test" is not a real provider
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
      into: null,
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
      into: null,
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

  it("counts every moved key and every applied deletion", async () => {
    // Sequential: the helper creates the project file on its first call.
    const mainKeys = [
      await createTranslationKey(db, projectId, "old.one"),
      await createTranslationKey(db, projectId, "old.two"),
    ];
    await addKeyDeletionsToBranch(
      branchId,
      mainKeys.map((key) => key.id),
    );
    await createTranslationKey(db, projectId, "new.one", { branchId });
    await createTranslationKey(db, projectId, "new.two", { branchId });

    const result = await mergeBranch(branchId, userId);

    expect(result).toEqual({
      success: true,
      keysMoved: 2,
      keysDeleted: 2,
      into: null,
    });
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
      reason: MERGE_FAILURE_REASON.NOT_OPEN,
      error: "Branch is not open",
    });
  });

  it("fails when branch does not exist", async () => {
    const result = await mergeBranch(9999, userId);

    expect(result).toEqual({
      success: false,
      reason: MERGE_FAILURE_REASON.NOT_FOUND,
      error: "Branch not found",
    });
  });

  it("persists null mergedBy when called without a user", async () => {
    await createTranslationKey(db, projectId, "branch.key", { branchId });

    const result = await mergeBranch(branchId, null);

    expect(result).toEqual({
      success: true,
      keysMoved: 1,
      keysDeleted: 0,
      into: null,
    });

    const merged = await db.query.branches.findFirst({
      where: { id: branchId },
    });
    expect(merged!.status).toBe(BRANCH_STATUS.MERGED);
    expect(merged!.mergedBy).toBeNull();
    expect(merged!.mergedAt).not.toBeNull();
  });
});

describe("mergeBranch into another branch", () => {
  let db: TestDb;
  let projectId: number;
  let childId: number;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();

    const org = await createOrganization(db);
    const project = await createProject(db, org.id);
    projectId = project.id;
    const child = await createBranch(db, projectId, {
      name: "child",
      slug: "child",
    });
    childId = child.id;
  });

  async function getKey(keyId: number) {
    return await db.query.translationKeys.findFirst({
      where: { id: keyId },
    });
  }

  async function getBranch(slug: string) {
    return await db.query.branches.findFirst({ where: { projectId, slug } });
  }

  it("moves the keys and the pending deletions to the target branch", async () => {
    const parent = await createBranch(db, projectId, {
      name: "parent",
      slug: "parent",
    });
    const childKey = await createTranslationKey(db, projectId, "child.key", {
      branchId: childId,
    });
    const mainKey = await createTranslationKey(db, projectId, "main.key");
    await addKeyDeletionsToBranch(childId, [mainKey.id]);

    const result = await mergeBranch(childId, null, "parent");

    expect(result).toEqual({
      success: true,
      keysMoved: 1,
      keysDeleted: 1,
      into: "parent",
    });
    expect((await getKey(childKey.id))!.branchId).toBe(parent.id);
    expect((await getKey(mainKey.id))!.deletedAt).toBeNull();
    expect(await getBranchKeyDeletionCount(childId)).toBe(0);
    expect(
      (await getBranchKeyDeletions(parent.id)).map((key) => key.id),
    ).toEqual([mainKey.id]);

    const child = await getBranch("child");
    expect(child!.status).toBe(BRANCH_STATUS.MERGED);
    expect(child!.mergedIntoBranchId).toBe(parent.id);
  });

  it("counts every moved key and every carried over deletion", async () => {
    const parent = await createBranch(db, projectId, {
      name: "parent",
      slug: "parent",
    });
    // Sequential: the helper creates the project file on its first call.
    const mainKeys = [
      await createTranslationKey(db, projectId, "main.one"),
      await createTranslationKey(db, projectId, "main.two"),
    ];
    await addKeyDeletionsToBranch(
      childId,
      mainKeys.map((key) => key.id),
    );
    await createTranslationKey(db, projectId, "child.one", {
      branchId: childId,
    });
    await createTranslationKey(db, projectId, "child.two", {
      branchId: childId,
    });

    const result = await mergeBranch(childId, null, "parent");

    expect(result).toEqual({
      success: true,
      keysMoved: 2,
      keysDeleted: 2,
      into: "parent",
    });
    expect(await getBranchKeyCount(parent.id)).toBe(2);
    expect(await getBranchKeyDeletionCount(parent.id)).toBe(2);
  });

  it("keeps a deletion already pending on the target branch", async () => {
    const parent = await createBranch(db, projectId, {
      name: "parent",
      slug: "parent",
    });
    const mainKey = await createTranslationKey(db, projectId, "main.key");
    await addKeyDeletionsToBranch(childId, [mainKey.id]);
    await addKeyDeletionsToBranch(parent.id, [mainKey.id]);

    const result = await mergeBranch(childId, null, "parent");

    expect(result).toMatchObject({ success: true, keysDeleted: 1 });
    expect(await getBranchKeyDeletionCount(parent.id)).toBe(1);
  });

  it("creates the target branch when it does not exist", async () => {
    const childKey = await createTranslationKey(db, projectId, "child.key", {
      branchId: childId,
    });

    const result = await mergeBranch(childId, null, "parent");

    expect(result).toMatchObject({ success: true, into: "parent" });
    const parent = await getBranch("parent");
    expect(parent!.status).toBe(BRANCH_STATUS.OPEN);
    expect((await getKey(childKey.id))!.branchId).toBe(parent!.id);
  });

  it("follows a merged target branch down to the open branch it was merged into", async () => {
    const grandParent = await createBranch(db, projectId, {
      name: "grand-parent",
      slug: "grand-parent",
    });
    const parent = await createBranch(db, projectId, {
      name: "parent",
      slug: "parent",
    });
    await mergeBranch(parent.id, null, "grand-parent");
    const childKey = await createTranslationKey(db, projectId, "child.key", {
      branchId: childId,
    });

    const result = await mergeBranch(childId, null, "parent");

    expect(result).toMatchObject({ success: true, into: "grand-parent" });
    expect((await getKey(childKey.id))!.branchId).toBe(grandParent.id);
    expect((await getBranch("child"))!.mergedIntoBranchId).toBe(grandParent.id);
  });

  it("merges into main when the target branch was merged into main", async () => {
    const parent = await createBranch(db, projectId, {
      name: "parent",
      slug: "parent",
    });
    await mergeBranch(parent.id, null);
    const childKey = await createTranslationKey(db, projectId, "child.key", {
      branchId: childId,
    });
    const mainKey = await createTranslationKey(db, projectId, "main.key");
    await addKeyDeletionsToBranch(childId, [mainKey.id]);

    const result = await mergeBranch(childId, null, "parent");

    expect(result).toEqual({
      success: true,
      keysMoved: 1,
      keysDeleted: 1,
      into: null,
    });
    expect((await getKey(childKey.id))!.branchId).toBeNull();
    expect((await getKey(mainKey.id))!.deletedAt).not.toBeNull();
    expect((await getBranch("child"))!.mergedIntoBranchId).toBeNull();
  });

  it("throws when the merged target branches form a cycle", async () => {
    const parent = await createBranch(db, projectId, {
      name: "parent",
      slug: "parent",
    });
    const other = await createBranch(db, projectId, {
      name: "other",
      slug: "other",
    });
    await db
      .update(schema.branches)
      .set({ status: BRANCH_STATUS.MERGED, mergedIntoBranchId: other.id })
      .where(eq(schema.branches.id, parent.id));
    await db
      .update(schema.branches)
      .set({ status: BRANCH_STATUS.MERGED, mergedIntoBranchId: parent.id })
      .where(eq(schema.branches.id, other.id));

    await expect(mergeBranch(childId, null, "parent")).rejects.toThrow(
      'Branch "parent" is merged into a cycle of branches',
    );
    expect((await getBranch("child"))!.status).toBe(BRANCH_STATUS.OPEN);
  });

  it("fails when the target resolves to the merged branch itself", async () => {
    const childKey = await createTranslationKey(db, projectId, "child.key", {
      branchId: childId,
    });

    const result = await mergeBranch(childId, null, "child");

    expect(result).toEqual({
      success: false,
      reason: MERGE_FAILURE_REASON.INTO_ITSELF,
      error: "A branch cannot be merged into itself",
    });
    expect((await getKey(childKey.id))!.branchId).toBe(childId);
    expect((await getBranch("child"))!.status).toBe(BRANCH_STATUS.OPEN);
  });
});
