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
import {
  deleteProject,
  getProjectDeletionSummary,
  getProjectLanguagesForProjects,
  getProjectsForOrganization,
  getTranslationCoverageForProjects,
} from "./projects.server";

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

  describe("getProjectsForOrganization", () => {
    it("returns empty array when no projects exist", async () => {
      const emptyOrg = await createOrganization(db);
      const projects = await getProjectsForOrganization(emptyOrg.id);
      expect(projects).toEqual([]);
    });

    it("returns projects ordered by name with translationKeyCount", async () => {
      const projectB = await createProject(db, organizationId, {
        name: "B Project",
        slug: "b-project",
      });
      const projectA = await createProject(db, organizationId, {
        name: "A Project",
        slug: "a-project",
      });

      await createTranslationKey(db, projectA.id, "key.one");
      await createTranslationKey(db, projectA.id, "key.two");
      await createTranslationKey(db, projectB.id, "key.one");

      const projects = await getProjectsForOrganization(organizationId);

      expect(projects).toHaveLength(3);
      expect(projects[0].name).toBe("A Project");
      expect(projects[0].translationKeyCount).toBe(2);
      expect(projects[1].name).toBe("B Project");
      expect(projects[1].translationKeyCount).toBe(1);
      // projectId was created in beforeEach with name "Test Project N"
      expect(projects[2].id).toBe(projectId);
    });

    it("excludes soft-deleted and branch keys from translationKeyCount", async () => {
      const branch = await createBranch(db, projectId);
      await createTranslationKey(db, projectId, "active.key");
      await createTranslationKey(db, projectId, "deleted.key", {
        deletedAt: new Date(),
      });
      await createTranslationKey(db, projectId, "branch.key", {
        branchId: branch.id,
      });

      const [project] = await getProjectsForOrganization(organizationId);
      expect(project.translationKeyCount).toBe(1);
    });

    it("does not return projects from other organizations", async () => {
      const otherOrg = await createOrganization(db);
      await createProject(db, otherOrg.id, { slug: "other-project" });

      const projects = await getProjectsForOrganization(organizationId);
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe(projectId);
    });
  });

  describe("getProjectLanguagesForProjects", () => {
    it("returns empty array when given an empty list", async () => {
      const result = await getProjectLanguagesForProjects([]);
      expect(result).toEqual([]);
    });

    it("returns languages for the given projects", async () => {
      await createProjectLanguage(db, projectId, {
        locale: "en",
        isDefault: true,
      });
      await createProjectLanguage(db, projectId, {
        locale: "fr",
        isDefault: false,
      });

      const result = await getProjectLanguagesForProjects([{ id: projectId }]);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { projectId, locale: "en", isDefault: true },
        { projectId, locale: "fr", isDefault: false },
      ]);
    });

    it("does not return languages from other projects", async () => {
      const otherProject = await createProject(db, organizationId, {
        slug: "other-project",
      });
      await createProjectLanguage(db, otherProject.id, {
        locale: "de",
        isDefault: true,
      });
      await createProjectLanguage(db, projectId, {
        locale: "en",
        isDefault: true,
      });

      const result = await getProjectLanguagesForProjects([{ id: projectId }]);

      expect(result).toEqual([{ projectId, locale: "en", isDefault: true }]);
    });

    it("returns languages for multiple projects at once", async () => {
      const project2 = await createProject(db, organizationId, {
        slug: "project-2",
      });
      await createProjectLanguage(db, projectId, {
        locale: "en",
        isDefault: true,
      });
      await createProjectLanguage(db, project2.id, {
        locale: "fr",
        isDefault: true,
      });

      const result = await getProjectLanguagesForProjects([
        { id: projectId },
        { id: project2.id },
      ]);

      expect(result).toEqual([
        { projectId, locale: "en", isDefault: true },
        { projectId: project2.id, locale: "fr", isDefault: true },
      ]);
    });
  });

  describe("getTranslationCoverageForProjects", () => {
    it("returns empty array when given an empty list", async () => {
      const result = await getTranslationCoverageForProjects([]);
      expect(result).toEqual([]);
    });

    it("counts translations for non-default locales only", async () => {
      await createProjectLanguage(db, projectId, {
        locale: "en",
        isDefault: true,
      });
      await createProjectLanguage(db, projectId, {
        locale: "fr",
        isDefault: false,
      });

      const key = await createTranslationKey(db, projectId, "greeting");
      await createTranslation(db, key.id, "en", "Hello");

      const resultBeforeTranslations = await getTranslationCoverageForProjects([
        { id: projectId },
      ]);

      // default translations are not counted towards coverage
      expect(resultBeforeTranslations).toEqual([
        { projectId, translatedCount: 0, totalPossible: 1, coverage: 0 },
      ]);

      await createTranslation(db, key.id, "fr", "Bonjour");

      const result = await getTranslationCoverageForProjects([
        { id: projectId },
      ]);

      // Only the "fr" (non-default) translation should be counted
      expect(result).toEqual([
        { projectId, translatedCount: 1, totalPossible: 1, coverage: 1 },
      ]);
    });

    it("count translated count with several languages", async () => {
      await createProjectLanguage(db, projectId, {
        locale: "en",
        isDefault: true,
      });
      await createProjectLanguage(db, projectId, {
        locale: "fr",
        isDefault: false,
      });
      await createProjectLanguage(db, projectId, {
        locale: "de",
        isDefault: false,
      });

      const key = await createTranslationKey(db, projectId, "greeting");
      await createTranslation(db, key.id, "en", "Hello");
      await createTranslation(db, key.id, "fr", "Bonjour");
      await createTranslation(db, key.id, "de", "Hallo");

      const key2 = await createTranslationKey(db, projectId, "farewell");
      await createTranslation(db, key2.id, "en", "Goodbye");
      await createTranslation(db, key2.id, "fr", "Au revoir");

      const result = await getTranslationCoverageForProjects([
        { id: projectId },
      ]);

      // "fr" / "de" (non-default) translation should be counted
      expect(result).toEqual([
        { projectId, translatedCount: 3, totalPossible: 4, coverage: 0.75 },
      ]);
    });

    it("excludes soft-deleted keys", async () => {
      await createProjectLanguage(db, projectId, {
        locale: "en",
        isDefault: true,
      });
      await createProjectLanguage(db, projectId, {
        locale: "fr",
        isDefault: false,
      });

      const activeKey = await createTranslationKey(db, projectId, "active");
      await createTranslation(db, activeKey.id, "fr", "Actif");
      const deletedKey = await createTranslationKey(db, projectId, "deleted", {
        deletedAt: new Date(),
      });
      await createTranslation(db, deletedKey.id, "fr", "Supprimé");

      const result = await getTranslationCoverageForProjects([
        { id: projectId },
      ]);

      expect(result).toEqual([
        { projectId, translatedCount: 1, totalPossible: 1, coverage: 1 },
      ]);
    });

    it("excludes branch keys", async () => {
      await createProjectLanguage(db, projectId, {
        locale: "en",
        isDefault: true,
      });
      await createProjectLanguage(db, projectId, {
        locale: "fr",
        isDefault: false,
      });

      const branch = await createBranch(db, projectId);
      const mainKey = await createTranslationKey(db, projectId, "main.key");
      await createTranslation(db, mainKey.id, "fr", "Principal");
      const branchKey = await createTranslationKey(
        db,
        projectId,
        "branch.key",
        { branchId: branch.id },
      );
      await createTranslation(db, branchKey.id, "fr", "Branche");

      const result = await getTranslationCoverageForProjects([
        { id: projectId },
      ]);

      expect(result).toEqual([
        { projectId, translatedCount: 1, totalPossible: 1, coverage: 1 },
      ]);
    });

    it("returns coverage for multiple projects", async () => {
      const project2 = await createProject(db, organizationId, {
        slug: "project-2",
      });

      await createProjectLanguage(db, projectId, {
        locale: "en",
        isDefault: true,
      });
      await createProjectLanguage(db, projectId, {
        locale: "fr",
        isDefault: false,
      });
      await createProjectLanguage(db, project2.id, {
        locale: "en",
        isDefault: true,
      });
      await createProjectLanguage(db, project2.id, {
        locale: "de",
        isDefault: false,
      });

      const key1 = await createTranslationKey(db, projectId, "key");
      await createTranslation(db, key1.id, "fr", "Bonjour");
      const key2 = await createTranslationKey(db, project2.id, "key");
      await createTranslation(db, key2.id, "de", "Hallo");

      const result = await getTranslationCoverageForProjects([
        { id: projectId },
        { id: project2.id },
      ]);

      expect(result).toEqual([
        { projectId, translatedCount: 1, totalPossible: 1, coverage: 1 },
        {
          projectId: project2.id,
          translatedCount: 1,
          totalPossible: 1,
          coverage: 1,
        },
      ]);
    });
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
