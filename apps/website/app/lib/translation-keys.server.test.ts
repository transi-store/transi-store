import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupportedFormat } from "@transi-store/common";
import * as schema from "../../drizzle/schema";
import {
  getTestDb,
  createOrganization,
  createProject,
  createProjectFile,
  createBranch,
  createTranslationKey,
  createTranslation,
  type TestDb,
} from "../../tests/test-db";
import {
  getProjectTranslations,
  getTranslationKeys,
} from "./translation-keys.server";
import { addKeyDeletionsToBranch } from "./branches.server";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

Date.now = () => 1_767_268_800_000; // Mock current date to Jan 1, 2026

const NOW = new Date(Date.now());

describe("getProjectTranslations", () => {
  let db: TestDb;
  let projectId: number;
  let orgId: number;
  let fileId: number;

  beforeEach(async () => {
    db = getTestDb();

    const org = await createOrganization(db);
    orgId = org.id;
    const project = await createProject(db, orgId);
    projectId = project.id;
    const file = await createProjectFile(db, {
      projectId,
      format: SupportedFormat.JSON,
      filePath: "<lang>.json",
    });
    fileId = file.id;
  });

  it("returns empty array when project has no keys", async () => {
    const result = await getProjectTranslations(projectId, fileId);
    expect(result).toEqual([]);
  });

  it("returns keys with their translations", async () => {
    const key = await createTranslationKey(db, projectId, "hello.world");
    await createTranslation(db, key.id, "fr", "Bonjour le monde");
    await createTranslation(db, key.id, "en", "Hello world");

    const result = await getProjectTranslations(projectId, fileId);

    expect(result).toEqual([
      {
        branchId: null,
        deletedAt: null,
        id: key.id,
        projectId,
        fileId: key.fileId,
        description: null,
        keyName: "hello.world",
        createdAt: NOW,
        updatedAt: NOW,
        translations: [
          {
            id: 1,
            keyId: key.id,
            locale: "fr",
            value: "Bonjour le monde",
            isFuzzy: false,
            createdAt: NOW,
            updatedAt: NOW,
          },
          {
            id: 2,
            keyId: key.id,
            locale: "en",
            value: "Hello world",
            isFuzzy: false,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      },
    ]);
  });

  it("returns keys sorted alphabetically by keyName", async () => {
    await createTranslationKey(db, projectId, "zebra");
    await createTranslationKey(db, projectId, "apple");
    await createTranslationKey(db, projectId, "mango");

    const result = await getProjectTranslations(projectId, fileId);

    expect(result.map((r) => r.keyName)).toEqual(["apple", "mango", "zebra"]);
  });

  it("returns only main branch keys when no branchId specified", async () => {
    const branch = await createBranch(db, projectId);
    await createTranslationKey(db, projectId, "main.key");
    await createTranslationKey(db, projectId, "branch.key", {
      branchId: branch.id,
    });

    const result = await getProjectTranslations(projectId, fileId);

    expect(result).toHaveLength(1);
    expect(result[0].keyName).toBe("main.key");
  });

  it("returns main + branch keys when branchId is specified", async () => {
    const branch = await createBranch(db, projectId);
    await createTranslationKey(db, projectId, "main.key");
    await createTranslationKey(db, projectId, "branch.key", {
      branchId: branch.id,
    });

    const result = await getProjectTranslations(projectId, fileId, {
      branchId: branch.id,
    });

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.keyName)).toEqual(["branch.key", "main.key"]);
  });

  it("returns only main key when branchId is unknown", async () => {
    await createTranslationKey(db, projectId, "main.key");

    const result = await getProjectTranslations(projectId, fileId, {
      branchId: 9999,
    });

    expect(result).toHaveLength(1);
    expect(result[0].keyName).toBe("main.key");
  });

  it("does not return keys from other projects", async () => {
    const otherProject = await createProject(db, orgId);
    await createTranslationKey(db, projectId, "my.key");
    await createTranslationKey(db, otherProject.id, "other.key");

    const result = await getProjectTranslations(projectId, fileId);

    expect(result).toHaveLength(1);
    expect(result[0].keyName).toBe("my.key");
  });

  it("attaches correct translations to each key", async () => {
    const key1 = await createTranslationKey(db, projectId, "key1");
    const key2 = await createTranslationKey(db, projectId, "key2");
    await createTranslation(db, key1.id, "fr", "Valeur 1");
    await createTranslation(db, key2.id, "fr", "Valeur 2");
    await createTranslation(db, key2.id, "en", "Value 2");

    const result = await getProjectTranslations(projectId, fileId);

    const r1 = result.find((r) => r.keyName === "key1")!;
    const r2 = result.find((r) => r.keyName === "key2")!;

    expect(r1.translations).toHaveLength(1);
    expect(r1.translations[0].value).toBe("Valeur 1");

    expect(r2.translations).toHaveLength(2);
    expect(r2.translations.map((t) => t.locale).sort()).toEqual(["en", "fr"]);
  });

  describe("soft-delete filtering", () => {
    it("excludes soft-deleted keys from main results", async () => {
      await createTranslationKey(db, projectId, "alive.key");
      await createTranslationKey(db, projectId, "deleted.key", {
        deletedAt: new Date(),
      });

      const result = await getProjectTranslations(projectId, fileId);

      expect(result).toHaveLength(1);
      expect(result[0].keyName).toBe("alive.key");
    });

    it("excludes soft-deleted keys when fetching with branch", async () => {
      const branch = await createBranch(db, projectId);
      await createTranslationKey(db, projectId, "alive.key");
      await createTranslationKey(db, projectId, "deleted.key", {
        deletedAt: new Date(),
      });
      await createTranslationKey(db, projectId, "branch.key", {
        branchId: branch.id,
      });

      const result = await getProjectTranslations(projectId, fileId, {
        branchId: branch.id,
      });

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.keyName).sort()).toEqual([
        "alive.key",
        "branch.key",
      ]);
    });
  });

  describe("allBranches option", () => {
    it("returns keys from all branches when allBranches is true", async () => {
      const branch1 = await createBranch(db, projectId, {
        name: "branch-1",
        slug: "branch-1",
      });
      const branch2 = await createBranch(db, projectId, {
        name: "branch-2",
        slug: "branch-2",
      });
      await createTranslationKey(db, projectId, "main.key");
      await createTranslationKey(db, projectId, "branch1.key", {
        branchId: branch1.id,
      });
      await createTranslationKey(db, projectId, "branch2.key", {
        branchId: branch2.id,
      });

      const result = await getProjectTranslations(projectId, fileId, {
        allBranches: true,
      });

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.keyName)).toEqual([
        "branch1.key",
        "branch2.key",
        "main.key",
      ]);
    });

    it("excludes soft-deleted keys when allBranches is true", async () => {
      const branch = await createBranch(db, projectId);
      await createTranslationKey(db, projectId, "alive.key");
      await createTranslationKey(db, projectId, "deleted.key", {
        deletedAt: new Date(),
      });
      await createTranslationKey(db, projectId, "branch.alive", {
        branchId: branch.id,
      });
      await createTranslationKey(db, projectId, "branch.deleted", {
        branchId: branch.id,
        deletedAt: new Date(),
      });

      const result = await getProjectTranslations(projectId, fileId, {
        allBranches: true,
      });

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.keyName)).toEqual([
        "alive.key",
        "branch.alive",
      ]);
    });

    it("does not apply branch deletion markers when allBranches is true", async () => {
      const branch = await createBranch(db, projectId);
      const key = await createTranslationKey(db, projectId, "some.key");
      await addKeyDeletionsToBranch(branch.id, [key.id]);

      const result = await getProjectTranslations(projectId, fileId, {
        allBranches: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].keyName).toBe("some.key");
    });
  });

  describe("branch deletion exclusion on export", () => {
    it("excludes keys marked for deletion in branch from export", async () => {
      const branch = await createBranch(db, projectId);
      await createTranslationKey(db, projectId, "keep.key");
      const key2 = await createTranslationKey(
        db,
        projectId,
        "marked.for.delete",
      );
      await addKeyDeletionsToBranch(branch.id, [key2.id]);

      const result = await getProjectTranslations(projectId, fileId, {
        branchId: branch.id,
      });

      expect(result).toHaveLength(1);
      expect(result[0].keyName).toBe("keep.key");
    });

    it("does not exclude marked keys when no branchId is specified", async () => {
      const branch = await createBranch(db, projectId);
      const key = await createTranslationKey(db, projectId, "some.key");
      await addKeyDeletionsToBranch(branch.id, [key.id]);

      // Without branchId, the deletion markers are not applied
      const result = await getProjectTranslations(projectId, fileId);

      expect(result).toHaveLength(1);
      expect(result[0].keyName).toBe("some.key");
    });
  });
});

describe("getTranslationKeys fileId filter", () => {
  let db: TestDb;
  let projectId: number;
  let fileA: number;
  let fileB: number;

  beforeEach(async () => {
    db = getTestDb();
    const org = await createOrganization(db);
    const project = await createProject(db, org.id);
    projectId = project.id;
    const a = await createProjectFile(db, {
      projectId,
      format: SupportedFormat.JSON,
      filePath: "locales/<lang>/a.json",
    });
    const b = await createProjectFile(db, {
      projectId,
      format: SupportedFormat.JSON,
      filePath: "locales/<lang>/b.json",
    });
    fileA = a.id;
    fileB = b.id;
  });

  it("returns only keys from the given fileId", async () => {
    await createTranslationKey(db, projectId, "a.key", { fileId: fileA });
    await createTranslationKey(db, projectId, "b.key", { fileId: fileB });

    const resultA = await getTranslationKeys(projectId, { fileId: fileA });
    const resultB = await getTranslationKeys(projectId, { fileId: fileB });

    expect(resultA.count).toBe(1);
    expect(resultA.data[0].keyName).toBe("a.key");
    expect(resultB.count).toBe(1);
    expect(resultB.data[0].keyName).toBe("b.key");
  });
});
