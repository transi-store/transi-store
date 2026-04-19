import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import * as schema from "../../drizzle/schema";
import { action } from "./api.orgs.$orgSlug.projects.$projectSlug.translations";
import { orgContext } from "~/middleware/api-auth";
import {
  cleanupDb,
  createApiKey,
  createOrganization,
  createProject,
  createProjectFile,
  createProjectLanguage,
  createTranslationKey,
  createTranslation,
  getTestDb,
} from "../../tests/test-db";
import { withQueryCounter, getQueryCount } from "~/lib/query-counter.server";
import { SupportedFormat } from "~/lib/format/types";
import { ImportStrategy } from "@transi-store/common";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

function buildImportRequest(
  orgSlug: string,
  projectSlug: string,
  data: Record<string, string>,
  options: {
    locale?: string;
    strategy?: ImportStrategy;
    format?: SupportedFormat;
    fileId: number;
  },
) {
  const {
    locale = "en",
    strategy = ImportStrategy.OVERWRITE,
    format = SupportedFormat.JSON,
    fileId,
  } = options;
  const formData = new FormData();
  formData.append("locale", locale);
  formData.append("strategy", strategy);
  formData.append("format", format);
  formData.append("fileId", String(fileId));
  formData.append(
    "file",
    new File([JSON.stringify(data)], "translations.json", {
      type: "application/json",
    }),
  );

  return new Request(
    `https://example.com/api/orgs/${orgSlug}/projects/${projectSlug}/translations`,
    {
      method: "POST",
      body: formData,
    },
  );
}

describe("Import API", () => {
  let org: schema.Organization;
  let projectFile: schema.ProjectFile;

  beforeEach(async () => {
    org = await createOrganization(getTestDb(), {
      slug: "test-org",
    });
    await createProject(getTestDb(), org.id, {
      name: "Test Project",
      slug: "test-project",
    });
    await createProjectLanguage(getTestDb(), 1, { locale: "en" });
    await createProjectLanguage(getTestDb(), 1, {
      locale: "fr",
      isDefault: false,
    });
    projectFile = await createProjectFile(getTestDb(), 1, {
      filePath: "<lang>.json",
    });

    await createApiKey(getTestDb(), org.id, {
      keyValue: "test-api-key",
    });
  });

  afterEach(async () => {
    await cleanupDb();
  });

  function createOrgContext() {
    const ctx = new RouterContextProvider();
    ctx.set(orgContext, org);
    return ctx;
  }

  function callAction(request: Request, orgSlug: string, projectSlug: string) {
    return action({
      request,
      params: { orgSlug, projectSlug },
      unstable_pattern: "/api/orgs/:orgSlug/projects/:projectSlug/translations",
      context: createOrgContext(),
    });
  }

  describe("key creation", () => {
    it("should create new translation keys", async () => {
      const request = buildImportRequest(
        "test-org",
        "test-project",
        {
          "home.title": "Home",
          "home.subtitle": "Welcome",
          "nav.about": "About",
        },
        { fileId: projectFile.id },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.stats.keysCreated).toBe(3);
      expect(data.stats.translationsCreated).toBe(3);

      // Verify keys exist in database
      const db = getTestDb();
      const keys = await db.query.translationKeys.findMany({
        where: { projectId: 1 },
        orderBy: { keyName: "asc" },
      });

      expect(keys).toHaveLength(3);
      expect(keys.map((k) => k.keyName)).toEqual([
        "home.subtitle",
        "home.title",
        "nav.about",
      ]);
    });

    it("should not duplicate existing keys", async () => {
      const db = getTestDb();
      await createTranslationKey(db, 1, "home.title");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        {
          "home.title": "Home",
          "home.subtitle": "Welcome",
        },
        { fileId: projectFile.id },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.stats.keysCreated).toBe(1); // Only home.subtitle is new
      expect(data.stats.translationsCreated).toBe(2); // home.title translation should still be created

      const keys = await db.query.translationKeys.findMany({
        where: { projectId: 1 },
      });

      expect(keys).toHaveLength(2);
    });
  });

  describe("overwrite strategy", () => {
    it("should update existing translations", async () => {
      const db = getTestDb();
      const key = await createTranslationKey(db, 1, "home.title");
      await createTranslation(db, key.id, "en", "Old Home");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        {
          "home.title": "New Home",
        },
        { fileId: projectFile.id },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.stats.translationsUpdated).toBe(1);
      expect(data.stats.translationsCreated).toBe(0);

      // Verify value was updated
      const translations = await db.query.translations.findFirst({
        where: { keyId: key.id, locale: "en" },
      });

      expect(translations).not.toBeNull();
      expect(translations!.value).toBe("New Home");
    });

    it("should create new translations for existing keys", async () => {
      const db = getTestDb();
      await createTranslationKey(db, 1, "home.title");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        {
          "home.title": "Home",
        },
        { fileId: projectFile.id },
      );

      const response = await callAction(request, "test-org", "test-project");
      const data = await response.json();
      expect(data.stats.translationsCreated).toBe(1);
      expect(data.stats.translationsUpdated).toBe(0);
    });

    it("should not touch translations of other locales", async () => {
      const db = getTestDb();
      const key = await createTranslationKey(db, 1, "home.title");
      await createTranslation(db, key.id, "fr", "Accueil");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        {
          "home.title": "Home",
        },
        { fileId: projectFile.id },
      );

      const response = await callAction(request, "test-org", "test-project");

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.stats.keysCreated).toBe(0);
      expect(data.stats.translationsCreated).toBe(1);
      expect(data.stats.translationsUpdated).toBe(0);

      // French translation should be untouched
      const frTranslation = await db.query.translations.findFirst({
        where: { keyId: key.id, locale: "fr" },
      });

      expect(frTranslation).toBeDefined();
      expect(frTranslation?.value).toBe("Accueil");
    });
  });

  describe("skip strategy", () => {
    it("should skip existing translations", async () => {
      const db = getTestDb();
      const key = await createTranslationKey(db, 1, "home.title");
      await createTranslation(db, key.id, "en", "Old Home");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        { "home.title": "New Home" },
        { strategy: ImportStrategy.SKIP, fileId: projectFile.id },
      );

      const response = await callAction(request, "test-org", "test-project");
      const data = await response.json();
      expect(data.stats.translationsSkipped).toBe(1);
      expect(data.stats.translationsUpdated).toBe(0);

      // Verify value was NOT updated
      const translations = await db.query.translations.findFirst({
        where: { keyId: key.id, locale: "en" },
      });

      expect(translations).not.toBeNull();
      expect(translations?.value).toBe("Old Home");
    });

    it("should still create new translations", async () => {
      const db = getTestDb();
      const existingKey = await createTranslationKey(db, 1, "home.title");
      await createTranslation(db, existingKey.id, "en", "Old Home");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        {
          "home.title": "New Home",
          "home.subtitle": "Welcome",
        },
        { strategy: ImportStrategy.SKIP, fileId: projectFile.id },
      );

      const response = await callAction(request, "test-org", "test-project");
      const data = await response.json();
      expect(data.stats.translationsSkipped).toBe(1);
      expect(data.stats.translationsCreated).toBe(1);
      expect(data.stats.keysCreated).toBe(1);
    });
  });

  describe("empty string values", () => {
    it("should not create translations for empty string values (overwrite strategy)", async () => {
      const request = buildImportRequest(
        "test-org",
        "test-project",
        {
          "home.title": "Home",
          "home.empty": "",
        },
        { fileId: projectFile.id },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.stats.keysCreated).toBe(2); // Both keys are created
      expect(data.stats.translationsCreated).toBe(1); // Only non-empty translation is created

      const db = getTestDb();
      const translations = await db.query.translations.findMany({
        where: { locale: "en" },
      });

      expect(translations).toHaveLength(1);
      expect(translations[0].value).toBe("Home");
    });

    it("should not update translations to empty string values (overwrite strategy)", async () => {
      const db = getTestDb();
      const key = await createTranslationKey(db, 1, "home.title");
      await createTranslation(db, key.id, "en", "Old Home");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        {
          "home.title": "",
        },
        { fileId: projectFile.id },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.stats.translationsCreated).toBe(0);
      expect(data.stats.translationsUpdated).toBe(0);

      // Verify value was NOT updated
      const translation = await db.query.translations.findFirst({
        where: { keyId: key.id, locale: "en" },
      });

      expect(translation?.value).toBe("Old Home");
    });

    it("should not create translations for empty string values (skip strategy)", async () => {
      const request = buildImportRequest(
        "test-org",
        "test-project",
        {
          "home.title": "Home",
          "home.empty": "",
        },
        { strategy: ImportStrategy.SKIP, fileId: projectFile.id },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.stats.keysCreated).toBe(2); // Both keys are created
      expect(data.stats.translationsCreated).toBe(1); // Only non-empty translation is created

      const db = getTestDb();
      const translations = await db.query.translations.findMany({
        where: { locale: "en" },
      });

      expect(translations).toHaveLength(1);
      expect(translations[0].value).toBe("Home");
    });
  });

  describe("query count", () => {
    it("should use a bounded number of queries regardless of import size", async () => {
      const smallData: Record<string, string> = {};
      for (let i = 0; i < 10; i++) {
        smallData[`key.small.${i}`] = `value ${i}`;
      }

      const largeData: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        largeData[`key.large.${i}`] = `value ${i}`;
      }

      let smallQueryCount: number;
      let largeQueryCount: number;

      // Measure queries for small import
      await withQueryCounter(async () => {
        const request = buildImportRequest(
          "test-org",
          "test-project",
          smallData,
          { fileId: projectFile.id },
        );
        await callAction(request, "test-org", "test-project");
        smallQueryCount = getQueryCount();
      });

      await cleanupDb();

      // Re-seed
      org = await createOrganization(getTestDb(), {
        slug: "test-org",
      });
      await createProject(getTestDb(), org.id, {
        name: "Test Project",
        slug: "test-project",
      });
      await createProjectLanguage(getTestDb(), 1, { locale: "en" });
      projectFile = await createProjectFile(getTestDb(), 1, {
        filePath: "<lang>.json",
      });

      // Measure queries for large import
      await withQueryCounter(async () => {
        const request = buildImportRequest(
          "test-org",
          "test-project",
          largeData,
          { fileId: projectFile.id },
        );
        await callAction(request, "test-org", "test-project");
        largeQueryCount = getQueryCount();
      });

      // The query count should NOT scale linearly with import size.
      // With batch operations, both should use roughly the same number of queries.
      // Auth queries are handled by middleware (not counted here).
      expect(smallQueryCount!).toBe(6);
      expect(largeQueryCount!).toBe(6);
    });
  });
});
