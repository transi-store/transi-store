import { describe, it, expect, vi, beforeEach } from "vitest";
import * as schema from "../../drizzle/schema";
import {
  getTestDb,
  createOrganization,
  createProject,
  createBranch,
  createTranslationKey,
  createTranslation,
  type TestDb,
} from "../../tests/test-db";
import { getProjectTranslations } from "./translation-keys.server";

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

  beforeEach(async () => {
    db = getTestDb();

    const org = await createOrganization(db);
    orgId = org.id;
    const project = await createProject(db, orgId);
    projectId = project.id;
  });

  it("returns empty array when project has no keys", async () => {
    const result = await getProjectTranslations(projectId);
    expect(result).toEqual([]);
  });

  it("returns keys with their translations", async () => {
    const key = await createTranslationKey(db, projectId, "hello.world");
    await createTranslation(db, key.id, "fr", "Bonjour le monde");
    await createTranslation(db, key.id, "en", "Hello world");

    const result = await getProjectTranslations(projectId);

    expect(result).toEqual([
      {
        branchId: null,
        deletedAt: null,
        id: key.id,
        projectId,
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

    const result = await getProjectTranslations(projectId);

    expect(result.map((r) => r.keyName)).toEqual(["apple", "mango", "zebra"]);
  });

  it("returns only main branch keys when no branchId specified", async () => {
    const branch = await createBranch(db, projectId);
    await createTranslationKey(db, projectId, "main.key");
    await createTranslationKey(db, projectId, "branch.key", {
      branchId: branch.id,
    });

    const result = await getProjectTranslations(projectId);

    expect(result).toHaveLength(1);
    expect(result[0].keyName).toBe("main.key");
  });

  it("returns main + branch keys when branchId is specified", async () => {
    const branch = await createBranch(db, projectId);
    await createTranslationKey(db, projectId, "main.key");
    await createTranslationKey(db, projectId, "branch.key", {
      branchId: branch.id,
    });

    const result = await getProjectTranslations(projectId, {
      branchId: branch.id,
    });

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.keyName)).toEqual(["branch.key", "main.key"]);
  });

  it("returns only main key when branchId is unknown", async () => {
    await createTranslationKey(db, projectId, "main.key");

    const result = await getProjectTranslations(projectId, {
      branchId: 9999,
    });

    expect(result).toHaveLength(1);
    expect(result[0].keyName).toBe("main.key");
  });

  it("does not return keys from other projects", async () => {
    const otherProject = await createProject(db, orgId);
    await createTranslationKey(db, projectId, "my.key");
    await createTranslationKey(db, otherProject.id, "other.key");

    const result = await getProjectTranslations(projectId);

    expect(result).toHaveLength(1);
    expect(result[0].keyName).toBe("my.key");
  });

  it("attaches correct translations to each key", async () => {
    const key1 = await createTranslationKey(db, projectId, "key1");
    const key2 = await createTranslationKey(db, projectId, "key2");
    await createTranslation(db, key1.id, "fr", "Valeur 1");
    await createTranslation(db, key2.id, "fr", "Valeur 2");
    await createTranslation(db, key2.id, "en", "Value 2");

    const result = await getProjectTranslations(projectId);

    const r1 = result.find((r) => r.keyName === "key1")!;
    const r2 = result.find((r) => r.keyName === "key2")!;

    expect(r1.translations).toHaveLength(1);
    expect(r1.translations[0].value).toBe("Valeur 1");

    expect(r2.translations).toHaveLength(2);
    expect(r2.translations.map((t) => t.locale).sort()).toEqual(["en", "fr"]);
  });
});
