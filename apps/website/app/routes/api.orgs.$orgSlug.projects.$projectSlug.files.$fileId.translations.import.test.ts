import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import * as schema from "../../drizzle/schema";
import { action } from "./api.orgs.$orgSlug.projects.$projectSlug.files.$fileId.translations";
import { orgContext } from "~/middleware/api-auth.server";
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
import { BRANCH_STATUS } from "~/lib/branches";
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
  fileId: number,
  data: Record<string, string>,
  options: {
    locale?: string;
    strategy?: ImportStrategy;
    format?: SupportedFormat;
  } = {},
) {
  const {
    locale = "en",
    strategy = ImportStrategy.OVERWRITE,
    format = SupportedFormat.JSON,
  } = options;
  const formData = new FormData();
  formData.append("locale", locale);
  formData.append("strategy", strategy);
  formData.append("format", format);
  formData.append(
    "file",
    new File([JSON.stringify(data)], "translations.json", {
      type: "application/json",
    }),
  );

  return new Request(
    `https://example.com/api/orgs/${orgSlug}/projects/${projectSlug}/files/${fileId}/translations`,
    {
      method: "POST",
      body: formData,
    },
  );
}

function buildImportRequestWithRawFile(
  orgSlug: string,
  projectSlug: string,
  fileId: number,
  content: string,
  options: {
    locale?: string;
    strategy?: ImportStrategy;
    format?: SupportedFormat;
    fileName: string;
    contentType: string;
    branch?: string;
  },
) {
  const {
    locale = "en",
    strategy = ImportStrategy.OVERWRITE,
    format,
    fileName,
    contentType,
    branch,
  } = options;
  const formData = new FormData();
  formData.append("locale", locale);
  formData.append("strategy", strategy);
  if (format) {
    formData.append("format", format);
  }
  if (branch) {
    formData.append("branch", branch);
  }
  formData.append("file", new File([content], fileName, { type: contentType }));

  return new Request(
    `https://example.com/api/orgs/${orgSlug}/projects/${projectSlug}/files/${fileId}/translations`,
    {
      method: "POST",
      body: formData,
    },
  );
}

describe("Import file-scoped API", () => {
  let org: schema.Organization;
  let projectFile: schema.ProjectFile;

  beforeEach(async () => {
    org = await createOrganization(getTestDb(), {
      slug: "test-org",
    });
    const project = await createProject(getTestDb(), org.id, {
      name: "Test Project",
      slug: "test-project",
    });
    projectFile = await createProjectFile(getTestDb(), {
      projectId: project.id,
      format: SupportedFormat.JSON,
      filePath: "locales/<lang>/common.json",
    });
    await createProjectLanguage(getTestDb(), project.id, { locale: "en" });
    await createProjectLanguage(getTestDb(), project.id, {
      locale: "fr",
      isDefault: false,
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

  function callAction(
    request: Request,
    orgSlug: string,
    projectSlug: string,
    fileId: number | string = projectFile.id,
  ) {
    return action({
      request,
      url: new URL(request.url),
      params: { orgSlug, projectSlug, fileId: String(fileId) },
      pattern:
        "/api/orgs/:orgSlug/projects/:projectSlug/files/:fileId/translations",
      context: createOrgContext(),
    });
  }

  describe("key creation", () => {
    it("should create new translation keys", async () => {
      const request = buildImportRequest(
        "test-org",
        "test-project",
        projectFile.id,
        {
          "home.title": "Home",
          "home.subtitle": "Welcome",
          "nav.about": "About",
        },
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
      // All keys should be attached to the target file
      expect(keys.every((k) => k.fileId === projectFile.id)).toBe(true);
    });

    it("should not duplicate existing keys", async () => {
      const db = getTestDb();
      await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });

      const request = buildImportRequest(
        "test-org",
        "test-project",
        projectFile.id,
        {
          "home.title": "Home",
          "home.subtitle": "Welcome",
        },
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
      const key = await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });
      await createTranslation(db, key.id, "en", "Old Home");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        projectFile.id,
        {
          "home.title": "New Home",
        },
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
      await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });

      const request = buildImportRequest(
        "test-org",
        "test-project",
        projectFile.id,
        {
          "home.title": "Home",
        },
      );

      const response = await callAction(request, "test-org", "test-project");
      const data = await response.json();
      expect(data.stats.translationsCreated).toBe(1);
      expect(data.stats.translationsUpdated).toBe(0);
    });

    it("should not touch translations of other locales", async () => {
      const db = getTestDb();
      const key = await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });
      await createTranslation(db, key.id, "fr", "Accueil");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        projectFile.id,
        {
          "home.title": "Home",
        },
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
      const key = await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });
      await createTranslation(db, key.id, "en", "Old Home");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        projectFile.id,
        { "home.title": "New Home" },
        { strategy: ImportStrategy.SKIP },
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
      const existingKey = await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });
      await createTranslation(db, existingKey.id, "en", "Old Home");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        projectFile.id,
        {
          "home.title": "New Home",
          "home.subtitle": "Welcome",
        },
        { strategy: ImportStrategy.SKIP },
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
        projectFile.id,
        {
          "home.title": "Home",
          "home.empty": "",
        },
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
      const key = await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });
      await createTranslation(db, key.id, "en", "Old Home");

      const request = buildImportRequest(
        "test-org",
        "test-project",
        projectFile.id,
        {
          "home.title": "",
        },
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
        projectFile.id,
        {
          "home.title": "Home",
          "home.empty": "",
        },
        { strategy: ImportStrategy.SKIP },
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

  describe("file scoping", () => {
    it("should return 400 if fileId is not a valid number", async () => {
      const request = buildImportRequest(
        "test-org",
        "test-project",
        projectFile.id,
        { "home.title": "Home" },
      );

      const response = await callAction(
        request,
        "test-org",
        "test-project",
        "abc",
      );
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid file ID "abc"');
    });

    it("should return 404 if file does not belong to the project", async () => {
      const request = buildImportRequest("test-org", "test-project", 99999, {
        "home.title": "Home",
      });

      const response = await callAction(
        request,
        "test-org",
        "test-project",
        99999,
      );
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe(
        'File "99999" not found in project "test-project"',
      );
    });

    it("should attach new keys to the target file only", async () => {
      const db = getTestDb();
      const otherFile = await createProjectFile(db, {
        projectId: 1,
        format: SupportedFormat.JSON,
        filePath: "locales/<lang>/other.json",
      });
      await createTranslationKey(db, 1, "shared.key", {
        fileId: otherFile.id,
      });

      const request = buildImportRequest(
        "test-org",
        "test-project",
        projectFile.id,
        {
          "shared.key": "From common",
          "new.key": "New",
        },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);

      const data = await response.json();
      // "shared.key" exists in otherFile but not in projectFile → creates a new key
      // "new.key" is new → creates a new key
      expect(data.stats.keysCreated).toBe(2);

      const commonKeys = await db.query.translationKeys.findMany({
        where: { fileId: projectFile.id },
        orderBy: { keyName: "asc" },
      });
      expect(commonKeys.map((k) => k.keyName)).toEqual([
        "new.key",
        "shared.key",
      ]);

      const otherKeys = await db.query.translationKeys.findMany({
        where: { fileId: otherFile.id },
      });
      expect(otherKeys).toHaveLength(1);
      expect(otherKeys[0].keyName).toBe("shared.key");
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
          projectFile.id,
          smallData,
        );
        await callAction(request, "test-org", "test-project");
        smallQueryCount = getQueryCount();
      });

      await cleanupDb();

      // Re-seed
      org = await createOrganization(getTestDb(), {
        slug: "test-org",
      });
      const project = await createProject(getTestDb(), org.id, {
        name: "Test Project",
        slug: "test-project",
      });
      projectFile = await createProjectFile(getTestDb(), {
        projectId: project.id,
        format: SupportedFormat.JSON,
        filePath: "locales/<lang>/common.json",
      });
      await createProjectLanguage(getTestDb(), project.id, { locale: "en" });

      // Measure queries for large import
      await withQueryCounter(async () => {
        const request = buildImportRequest(
          "test-org",
          "test-project",
          projectFile.id,
          largeData,
        );
        await callAction(request, "test-org", "test-project");
        largeQueryCount = getQueryCount();
      });

      // The query count should NOT scale linearly with import size.
      // With batch operations, both should use roughly the same number of queries.
      // Auth queries are handled by middleware (not counted here).
      expect(smallQueryCount!).toBe(largeQueryCount!);
    });
  });

  describe("branch handling", () => {
    it("should create the branch when the import adds new keys", async () => {
      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        projectFile.id,
        JSON.stringify({ "home.title": "Home" }),
        {
          locale: "en",
          strategy: ImportStrategy.OVERWRITE,
          fileName: "translations.json",
          contentType: "application/json",
          branch: "feature-branch",
        },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);

      const db = getTestDb();
      const branch = await db.query.branches.findFirst({
        where: { projectId: 1, slug: "feature-branch" },
      });
      expect(branch).toBeDefined();

      const key = await db.query.translationKeys.findFirst({
        where: { projectId: 1, keyName: "home.title" },
      });
      expect(key?.branchId).toBe(branch!.id);
    });

    it("should not create the branch when every translation already exists (skip strategy)", async () => {
      const db = getTestDb();
      const key = await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });
      await createTranslation(db, key.id, "en", "Home");

      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        projectFile.id,
        JSON.stringify({ "home.title": "Home" }),
        {
          locale: "en",
          strategy: ImportStrategy.SKIP,
          fileName: "translations.json",
          contentType: "application/json",
          branch: "feature-branch",
        },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.stats.translationsSkipped).toBe(1);

      const branch = await db.query.branches.findFirst({
        where: { projectId: 1, slug: "feature-branch" },
      });
      expect(branch).toBeUndefined();
    });

    it("should not create the branch when all keys already exist (overwrite strategy)", async () => {
      const db = getTestDb();
      const key = await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });
      await createTranslation(db, key.id, "en", "Old Home");

      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        projectFile.id,
        JSON.stringify({ "home.title": "New Home" }),
        {
          locale: "en",
          strategy: ImportStrategy.OVERWRITE,
          fileName: "translations.json",
          contentType: "application/json",
          branch: "feature-branch",
        },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.stats.translationsUpdated).toBe(1);

      const branch = await db.query.branches.findFirst({
        where: { projectId: 1, slug: "feature-branch" },
      });
      expect(branch).toBeUndefined();
    });

    it("should not create the branch when the file contains no entries", async () => {
      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        projectFile.id,
        JSON.stringify({}),
        {
          locale: "en",
          strategy: ImportStrategy.OVERWRITE,
          fileName: "translations.json",
          contentType: "application/json",
          branch: "feature-branch",
        },
      );

      // Empty files are rejected before any branch is touched
      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(400);

      const db = getTestDb();
      const branch = await db.query.branches.findFirst({
        where: { projectId: 1, slug: "feature-branch" },
      });
      expect(branch).toBeUndefined();
    });

    it("should import translations without creating keys when the branch does not exist and all keys exist", async () => {
      const db = getTestDb();
      await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });

      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        projectFile.id,
        JSON.stringify({ "home.title": "Home" }),
        {
          locale: "en",
          strategy: ImportStrategy.OVERWRITE,
          fileName: "translations.json",
          contentType: "application/json",
          branch: "feature-branch",
        },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.stats.keysCreated).toBe(0);
      expect(data.stats.translationsCreated).toBe(1);

      const branch = await db.query.branches.findFirst({
        where: { projectId: 1, slug: "feature-branch" },
      });
      expect(branch).toBeUndefined();
    });

    it("should return 400 when the branch exists but is not open, even without new keys", async () => {
      const db = getTestDb();
      const key = await createTranslationKey(db, 1, "home.title", {
        fileId: projectFile.id,
      });
      await createTranslation(db, key.id, "en", "Home");
      const [mergedBranch] = await db
        .insert(schema.branches)
        .values({
          projectId: 1,
          name: "feature-branch",
          slug: "feature-branch",
          status: BRANCH_STATUS.MERGED,
        })
        .returning();

      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        projectFile.id,
        JSON.stringify({ "home.title": "Home" }),
        {
          locale: "en",
          strategy: ImportStrategy.SKIP,
          fileName: "translations.json",
          contentType: "application/json",
          branch: mergedBranch.slug,
        },
      );

      const response = await callAction(request, "test-org", "test-project");
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Import failed");
      expect(data.details).toBe("Branch 'feature-branch' is not open");
    });
  });

  describe("document format imports", () => {
    it("should import an mdx translation body for a document file", async () => {
      const db = getTestDb();
      const mdxFile = await createProjectFile(db, {
        projectId: 1,
        format: SupportedFormat.MDX,
        filePath: "docs/<lang>/usage.mdx",
      });

      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        mdxFile.id,
        "# Heading\n\nHello <Callout>world</Callout>",
        {
          locale: "fr",
          strategy: ImportStrategy.OVERWRITE,
          format: SupportedFormat.MDX,
          fileName: "usage.mdx",
          contentType: "text/mdx",
        },
      );

      const response = await callAction(
        request,
        "test-org",
        "test-project",
        mdxFile.id,
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.stats).toEqual({
        total: 1,
        keysCreated: 0,
        translationsCreated: 1,
        translationsUpdated: 0,
        translationsSkipped: 0,
      });

      const stored = await db.query.markdownDocumentTranslations.findFirst({
        where: { projectFileId: mdxFile.id, locale: "fr" },
      });
      expect(stored?.content).toBe(
        "# Heading\n\nHello <Callout>world</Callout>",
      );
    });

    it("should skip existing document translations with strategy=skip", async () => {
      const db = getTestDb();
      const mdxFile = await createProjectFile(db, {
        projectId: 1,
        format: SupportedFormat.MDX,
        filePath: "docs/<lang>/usage.mdx",
      });
      await db.insert(schema.markdownDocumentTranslations).values({
        projectFileId: mdxFile.id,
        locale: "fr",
        content: "# Existing",
      });

      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        mdxFile.id,
        "# Updated but skipped",
        {
          locale: "fr",
          strategy: ImportStrategy.SKIP,
          format: SupportedFormat.MDX,
          fileName: "usage.mdx",
          contentType: "text/mdx",
        },
      );

      const response = await callAction(
        request,
        "test-org",
        "test-project",
        mdxFile.id,
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.stats).toEqual({
        total: 1,
        keysCreated: 0,
        translationsCreated: 0,
        translationsUpdated: 0,
        translationsSkipped: 1,
      });

      const stored = await db.query.markdownDocumentTranslations.findFirst({
        where: { projectFileId: mdxFile.id, locale: "fr" },
      });
      expect(stored?.content).toBe("# Existing");
    });

    it("should return 400 when document upload format does not match file format", async () => {
      const db = getTestDb();
      const mdxFile = await createProjectFile(db, {
        projectId: 1,
        format: SupportedFormat.MDX,
        filePath: "docs/<lang>/usage.mdx",
      });

      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        mdxFile.id,
        "# Hello",
        {
          locale: "fr",
          strategy: ImportStrategy.OVERWRITE,
          format: SupportedFormat.MARKDOWN,
          fileName: "usage.md",
          contentType: "text/markdown",
        },
      );

      const response = await callAction(
        request,
        "test-org",
        "test-project",
        mdxFile.id,
      );
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe(
        "Format 'markdown' does not match the file's format 'mdx'. Omit the 'format' field or set it to 'mdx'.",
      );
    });

    it("should return 400 when importing document format into a key/value file", async () => {
      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        projectFile.id,
        "# Hello",
        {
          locale: "fr",
          strategy: ImportStrategy.OVERWRITE,
          format: SupportedFormat.MARKDOWN,
          fileName: "usage.md",
          contentType: "text/markdown",
        },
      );

      const response = await callAction(
        request,
        "test-org",
        "test-project",
        projectFile.id,
      );
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe(
        "Format 'markdown' stores one document body per locale and cannot be imported into 'json' key/value files. Use a key/value format instead.",
      );
    });

    it("should return 400 when importing a document file with a branch parameter", async () => {
      const db = getTestDb();
      const mdxFile = await createProjectFile(db, {
        projectId: 1,
        format: SupportedFormat.MDX,
        filePath: "docs/<lang>/usage.mdx",
      });

      const request = buildImportRequestWithRawFile(
        "test-org",
        "test-project",
        mdxFile.id,
        "# Hello",
        {
          locale: "fr",
          strategy: ImportStrategy.OVERWRITE,
          format: SupportedFormat.MDX,
          fileName: "usage.mdx",
          contentType: "text/mdx",
          branch: "feature-branch",
        },
      );

      const response = await callAction(
        request,
        "test-org",
        "test-project",
        mdxFile.id,
      );
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe(
        "Branch-scoped document imports are not supported by this endpoint.",
      );
    });
  });
});
