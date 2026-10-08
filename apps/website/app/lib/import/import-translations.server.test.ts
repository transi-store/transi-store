import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImportStrategy, SupportedFormat } from "@transi-store/common";
import * as schema from "../../../drizzle/schema";
import {
  getTestDb,
  cleanupDb,
  createOrganization,
  createProject,
  createProjectFile,
  createBranch,
  createTranslationKey,
  type TestDb,
} from "../../../tests/test-db";
import {
  addKeyDeletionsToBranch,
  getBranchKeyDeletions,
} from "../branches.server";
import { TranslationKeySource } from "../translation-key-source";
import { importTranslations } from "./import-translations.server";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

describe("importTranslations - branch deletions", () => {
  let db: TestDb;
  let projectId: number;
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
  });

  async function getMarkedKeyNames(branchId: number): Promise<Array<string>> {
    const keys = await getBranchKeyDeletions(branchId);
    return keys.map((key) => key.keyName);
  }

  it("marks main keys removed from the file for deletion on the branch", async () => {
    const branch = await createBranch(db, projectId);
    await createTranslationKey(db, projectId, "kept", { fileId });
    await createTranslationKey(db, projectId, "removed", { fileId });

    const result = await importTranslations({
      projectId,
      locale: "en",
      data: { kept: "Kept" },
      strategy: ImportStrategy.SKIP,
      branchSlug: branch.slug,
      fileId,
      removedKeyNames: ["removed"],
    });

    expect(result.success).toBe(true);
    expect(result.stats.keysMarkedForDeletion).toBe(1);
    expect(result.stats.keysUnmarkedForDeletion).toBe(0);
    expect(await getMarkedKeyNames(branch.id)).toEqual(["removed"]);
  });

  it("creates the branch when the import only has deletions", async () => {
    await createTranslationKey(db, projectId, "kept", { fileId });
    await createTranslationKey(db, projectId, "removed", { fileId });

    const result = await importTranslations({
      projectId,
      locale: "en",
      data: { kept: "Kept" },
      strategy: ImportStrategy.SKIP,
      branchSlug: "new-branch",
      fileId,
      removedKeyNames: ["removed"],
    });

    expect(result.success).toBe(true);
    const branch = await db.query.branches.findFirst({
      where: { projectId, slug: "new-branch" },
    });
    expect(branch).toBeDefined();
    expect(await getMarkedKeyNames(branch!.id)).toEqual(["removed"]);
  });

  it("does not create a branch when there is nothing to add or delete", async () => {
    await createTranslationKey(db, projectId, "kept", { fileId });

    const result = await importTranslations({
      projectId,
      locale: "en",
      data: { kept: "Kept" },
      strategy: ImportStrategy.SKIP,
      branchSlug: "new-branch",
      fileId,
      removedKeyNames: ["unknown"],
    });

    expect(result.success).toBe(true);
    expect(result.stats.keysMarkedForDeletion).toBe(0);
    const branch = await db.query.branches.findFirst({
      where: { projectId, slug: "new-branch" },
    });
    expect(branch).toBeUndefined();
  });

  it("only marks live main keys of the imported file", async () => {
    const branch = await createBranch(db, projectId);
    const otherBranch = await createBranch(db, projectId, {
      name: "other",
      slug: "other",
    });
    const otherFile = await createProjectFile(db, {
      projectId,
      format: SupportedFormat.JSON,
      filePath: "locales/<lang>/admin.json",
    });
    await createTranslationKey(db, projectId, "kept", { fileId });
    await createTranslationKey(db, projectId, "on.other.branch", {
      fileId,
      branchId: otherBranch.id,
    });
    await createTranslationKey(db, projectId, "already.deleted", {
      fileId,
      deletedAt: new Date(),
    });
    await createTranslationKey(db, projectId, "in.other.file", {
      fileId: otherFile.id,
    });

    const result = await importTranslations({
      projectId,
      locale: "en",
      data: { kept: "Kept" },
      strategy: ImportStrategy.SKIP,
      branchSlug: branch.slug,
      fileId,
      removedKeyNames: ["on.other.branch", "already.deleted", "in.other.file"],
    });

    expect(result.success).toBe(true);
    expect(result.stats.keysMarkedForDeletion).toBe(0);
    expect(await getMarkedKeyNames(branch.id)).toEqual([]);
  });

  it("cancels the pending deletion of keys present in the file again", async () => {
    const branch = await createBranch(db, projectId);
    const restored = await createTranslationKey(db, projectId, "restored", {
      fileId,
    });
    const stillRemoved = await createTranslationKey(
      db,
      projectId,
      "still.removed",
      { fileId },
    );
    await addKeyDeletionsToBranch(branch.id, [restored.id, stillRemoved.id]);

    const result = await importTranslations({
      projectId,
      locale: "en",
      data: { restored: "Restored" },
      strategy: ImportStrategy.SKIP,
      branchSlug: branch.slug,
      fileId,
      removedKeyNames: ["still.removed"],
    });

    expect(result.success).toBe(true);
    expect(result.stats.keysMarkedForDeletion).toBe(0);
    expect(result.stats.keysUnmarkedForDeletion).toBe(1);
    expect(await getMarkedKeyNames(branch.id)).toEqual(["still.removed"]);
  });

  it("deletes keys previously imported into the branch that are no longer in the file", async () => {
    await createTranslationKey(db, projectId, "kept", { fileId });
    const firstImport = await importTranslations({
      projectId,
      locale: "en",
      data: { kept: "Kept", "added.then.removed": "Removed" },
      strategy: ImportStrategy.SKIP,
      branchSlug: "feature-branch",
      fileId,
      removedKeyNames: [],
    });
    expect(firstImport.stats.keysCreated).toBe(1);

    const result = await importTranslations({
      projectId,
      locale: "en",
      data: { kept: "Kept" },
      strategy: ImportStrategy.SKIP,
      branchSlug: "feature-branch",
      fileId,
      removedKeyNames: [],
    });

    expect(result.success).toBe(true);
    expect(result.stats.branchKeysDeleted).toBe(1);
    const key = await db.query.translationKeys.findFirst({
      where: { projectId, keyName: "added.then.removed" },
    });
    expect(key).toBeUndefined();
  });

  it("keeps branch keys not created by an import and keys of other branches", async () => {
    const branch = await createBranch(db, projectId);
    const otherBranch = await createBranch(db, projectId, {
      name: "other",
      slug: "other",
    });
    await createTranslationKey(db, projectId, "kept", { fileId });
    await createTranslationKey(db, projectId, "created.from.ui", {
      fileId,
      branchId: branch.id,
      createdBySource: TranslationKeySource.WEBSITE,
    });
    // Created before the source was tracked
    await createTranslationKey(db, projectId, "unknown.source", {
      fileId,
      branchId: branch.id,
    });
    await createTranslationKey(db, projectId, "imported.on.other.branch", {
      fileId,
      branchId: otherBranch.id,
      createdBySource: TranslationKeySource.IMPORT,
    });

    const result = await importTranslations({
      projectId,
      locale: "en",
      data: { kept: "Kept" },
      strategy: ImportStrategy.SKIP,
      branchSlug: branch.slug,
      fileId,
      removedKeyNames: [],
    });

    expect(result.success).toBe(true);
    expect(result.stats.branchKeysDeleted).toBe(0);
    const keyNames = (
      await db.query.translationKeys.findMany({ where: { projectId } })
    ).map((key) => key.keyName);
    expect(keyNames).toEqual(
      expect.arrayContaining([
        "created.from.ui",
        "unknown.source",
        "imported.on.other.branch",
      ]),
    );
  });

  it("leaves branch deletions untouched without removedKeyNames", async () => {
    const branch = await createBranch(db, projectId);
    const key = await createTranslationKey(db, projectId, "marked", {
      fileId,
    });
    await addKeyDeletionsToBranch(branch.id, [key.id]);

    const result = await importTranslations({
      projectId,
      locale: "en",
      data: { marked: "Marked" },
      strategy: ImportStrategy.SKIP,
      branchSlug: branch.slug,
      fileId,
    });

    expect(result.success).toBe(true);
    expect(result.stats).not.toHaveProperty("keysMarkedForDeletion");
    expect(result.stats).not.toHaveProperty("keysUnmarkedForDeletion");
    expect(result.stats).not.toHaveProperty("branchKeysDeleted");
    expect(await getMarkedKeyNames(branch.id)).toEqual(["marked"]);
  });

  it("keeps keys previously imported into the branch without removedKeyNames", async () => {
    const branch = await createBranch(db, projectId);
    await createTranslationKey(db, projectId, "imported", {
      fileId,
      branchId: branch.id,
      createdBySource: TranslationKeySource.IMPORT,
    });

    const result = await importTranslations({
      projectId,
      locale: "en",
      data: { other: "Other" },
      strategy: ImportStrategy.SKIP,
      branchSlug: branch.slug,
      fileId,
    });

    expect(result.success).toBe(true);
    const key = await db.query.translationKeys.findFirst({
      where: { projectId, keyName: "imported" },
    });
    expect(key).toBeDefined();
  });
});
