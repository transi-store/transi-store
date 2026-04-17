import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import {
  cleanupDb,
  createBranch,
  createOrganization,
  createProject,
  createProjectLanguage,
  createTranslation,
  createTranslationKey,
  getTestDb,
  type TestDb,
} from "../../tests/test-db";
import { deleteProject, getProjectDeletionSummary } from "./projects.server";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

describe("projects.server", () => {
  let db: TestDb;
  let organizationId: number;
  let projectId: number;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();
    const organization = await createOrganization(db);
    organizationId = organization.id;
    const project = await createProject(db, organization.id);
    projectId = project.id;
  });

  describe("getProjectDeletionSummary", () => {
    it("counts active keys and translations across main and branches", async () => {
      await createProjectLanguage(db, projectId, {
        locale: "en",
        isDefault: true,
      });
      const branch = await createBranch(db, projectId);

      const mainKey = await createTranslationKey(db, projectId, "main.key");
      await createTranslation(db, mainKey.id, "en", "Main value");

      const branchKey = await createTranslationKey(
        db,
        projectId,
        "branch.key",
        {
          branchId: branch.id,
        },
      );
      await createTranslation(db, branchKey.id, "en", "Branch value");

      const softDeletedKey = await createTranslationKey(
        db,
        projectId,
        "deleted.key",
        {
          deletedAt: new Date(),
        },
      );
      await createTranslation(db, softDeletedKey.id, "en", "Deleted value");

      const summary = await getProjectDeletionSummary(projectId);

      expect(summary).toEqual({
        keyCount: 2,
        translationCount: 2,
        branchCount: 1,
      });
    });
  });

  describe("deleteProject", () => {
    it("removes project data explicitly without touching sibling projects", async () => {
      const siblingProject = await createProject(db, organizationId, {
        slug: "sibling-project",
        name: "Sibling Project",
      });

      await createProjectLanguage(db, projectId, {
        locale: "en",
        isDefault: true,
      });
      const branch = await createBranch(db, projectId);
      const mainKey = await createTranslationKey(db, projectId, "main.key");
      const branchKey = await createTranslationKey(
        db,
        projectId,
        "branch.key",
        {
          branchId: branch.id,
        },
      );
      await createTranslation(db, mainKey.id, "en", "Main value");
      await createTranslation(db, branchKey.id, "en", "Branch value");
      await db.insert(schema.branchKeyDeletions).values({
        branchId: branch.id,
        translationKeyId: mainKey.id,
      });

      await createProjectLanguage(db, siblingProject.id, {
        locale: "fr",
        isDefault: true,
      });
      const siblingKey = await createTranslationKey(
        db,
        siblingProject.id,
        "sibling.key",
      );
      await createTranslation(db, siblingKey.id, "fr", "Sibling value");

      await deleteProject(projectId);

      const [
        deletedProject,
        projectLanguagesCount,
        branchesCount,
        keysCount,
        translationsCount,
        branchKeyDeletionsCount,
        siblingProjectExists,
        siblingTranslationsCount,
      ] = await Promise.all([
        db.query.projects.findFirst({
          where: { id: projectId },
        }),
        db.$count(
          schema.projectLanguages,
          eq(schema.projectLanguages.projectId, projectId),
        ),
        db.$count(schema.branches, eq(schema.branches.projectId, projectId)),
        db.$count(
          schema.translationKeys,
          eq(schema.translationKeys.projectId, projectId),
        ),
        db.$count(
          schema.translations,
          inArray(schema.translations.keyId, [mainKey.id, branchKey.id]),
        ),
        db.$count(
          schema.branchKeyDeletions,
          eq(schema.branchKeyDeletions.branchId, branch.id),
        ),
        db.query.projects.findFirst({
          where: { id: siblingProject.id },
        }),
        db.$count(
          schema.translations,
          eq(schema.translations.keyId, siblingKey.id),
        ),
      ]);

      expect(deletedProject).toBeUndefined();
      expect(projectLanguagesCount).toBe(0);
      expect(branchesCount).toBe(0);
      expect(keysCount).toBe(0);
      expect(translationsCount).toBe(0);
      expect(branchKeyDeletionsCount).toBe(0);
      expect(siblingProjectExists).toBeDefined();
      expect(siblingTranslationsCount).toBe(1);
    });
  });
});
