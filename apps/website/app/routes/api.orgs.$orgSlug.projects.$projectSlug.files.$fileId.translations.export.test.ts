import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupportedFormat } from "@transi-store/common";
import * as schema from "../../drizzle/schema";
import { loader } from "./api.orgs.$orgSlug.projects.$projectSlug.files.$fileId.translations";
import { RouterContextProvider } from "react-router";
import { orgContext } from "~/middleware/api-auth.server";
import {
  cleanupDb,
  createBranch,
  createOrganization,
  createProject,
  createProjectFile,
  createProjectLanguage,
  createTranslation,
  createTranslationKey,
  getTestDb,
} from "../../tests/test-db";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

describe("Export file-scoped loader", () => {
  let org: schema.Organization;
  let projectFile: schema.ProjectFile;

  beforeEach(async () => {
    org = await createOrganization(getTestDb(), {
      slug: "test-org",
    });

    const project = await createProject(getTestDb(), org.id, {
      name: "Test Project 1",
      slug: "test-project",
    });

    projectFile = await createProjectFile(getTestDb(), {
      projectId: project.id,
      format: SupportedFormat.JSON,
      filePath: "locales/<lang>/common.json",
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

  function callLoader(
    url: string,
    fileId: string | number = projectFile.id,
    projectSlug = "test-project",
  ) {
    return loader({
      request: new Request(url),
      params: {
        orgSlug: "test-org",
        projectSlug,
        fileId: String(fileId),
      },
      unstable_pattern:
        "/api/orgs/:orgSlug/projects/:projectSlug/files/:fileId/translations",
      context: createOrgContext(),
    });
  }

  it("should return 404 if project does not exist", async () => {
    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/non-existent/files/${projectFile.id}/translations?locale=en`,
      projectFile.id,
      "non-existent",
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Project "non-existent" not found');
  });

  it("should return 400 if fileId is not a valid number", async () => {
    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/abc/translations?locale=en`,
      "abc",
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid file ID "abc"');
  });

  it("should return 404 if file does not belong to the project", async () => {
    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/99999/translations?locale=en`,
      99999,
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('File "99999" not found in project "test-project"');
  });

  it("should return 400 error when missing required parameters", async () => {
    // Missing locale → Zod validation error
    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/${projectFile.id}/translations`,
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toEqual(
      "locale: Invalid input: expected string, received undefined",
    );

    // Locale provided but no languages configured
    const response2 = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/${projectFile.id}/translations?locale=fr`,
    );

    expect(response2.status).toBe(400);
    const data2 = await response2.json();
    expect(data2.error).toBe("No languages configured for this project");

    await createProjectLanguage(getTestDb(), 1);

    // Locale provided but language not found in project
    const response3 = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/${projectFile.id}/translations?locale=dk`,
    );

    expect(response3.status).toBe(400);
    const data3 = await response3.json();
    expect(data3.error).toBe('Language "dk" does not exist in this project');
  });

  it("should succeed with valid parameters and existing project", async () => {
    await createProjectLanguage(getTestDb(), 1);
    await createTranslationKey(getTestDb(), 1, "test.key", {
      fileId: projectFile.id,
    });
    await createTranslation(getTestDb(), 1, "en", "Test Value");

    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/${projectFile.id}/translations?locale=en`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    const data = await response.json();

    expect(data).toEqual({
      "test.key": "Test Value",
    });
  });

  it("should use the file format by default when format param is omitted", async () => {
    await createProjectLanguage(getTestDb(), 1);
    await createTranslationKey(getTestDb(), 1, "test.key", {
      fileId: projectFile.id,
    });
    await createTranslation(getTestDb(), 1, "en", "Test Value");

    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/${projectFile.id}/translations?locale=en`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("should return 404 when locale exists but has no translations", async () => {
    const db = getTestDb();
    await createProjectLanguage(db, 1, { locale: "en", isDefault: true });
    await createProjectLanguage(db, 1, { locale: "de", isDefault: false });
    await createTranslationKey(db, 1, "error.unknown", {
      fileId: projectFile.id,
    });
    await createTranslation(db, 1, "en", "Unknown error");

    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/${projectFile.id}/translations?locale=de&format=json`,
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("No translations found for locale 'de'");
  });

  it.each([
    ["no branch param", undefined, { "main.key": "Main Value" }],
    [
      "branch=@all",
      "@all",
      { "main.key": "Main Value", "branch.key": "Branch Value" },
    ],
  ] as const)(
    "should return only main keys by default (no branch param)",
    async (_description, branchParam, expectedData) => {
      const db = getTestDb();
      await createProjectLanguage(db, 1);
      const branch = await createBranch(db, 1, {
        name: "feat",
        slug: "feat",
      });
      await createTranslationKey(db, 1, "main.key", { fileId: projectFile.id });
      await createTranslation(db, 1, "en", "Main Value");
      const branchKey = await createTranslationKey(db, 1, "branch.key", {
        branchId: branch.id,
        fileId: projectFile.id,
      });
      await createTranslation(db, branchKey.id, "en", "Branch Value");

      const response = await callLoader(
        `https://example.com/api/orgs/test-org/projects/test-project/files/${projectFile.id}/translations?locale=en${branchParam ? `&branch=${branchParam}` : ""}`,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(expectedData);
    },
  );

  it("should still allow converting between key/value formats on a non-document file", async () => {
    await createProjectLanguage(getTestDb(), 1);
    await createTranslationKey(getTestDb(), 1, "test.key", {
      fileId: projectFile.id,
    });
    await createTranslation(getTestDb(), 1, "en", "Test Value");

    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/${projectFile.id}/translations?locale=en&format=yaml`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("yaml");
  });

  it("should return 400 when requesting markdown format on a non-document file", async () => {
    await createProjectLanguage(getTestDb(), 1);

    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/${projectFile.id}/translations?locale=en&format=markdown`,
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      "Format 'markdown' does not match the file's format 'json'. Omit the 'format' query param or set it to 'json'.",
    );
  });

  it("should return 400 when requesting mdx format on a non-document file", async () => {
    await createProjectLanguage(getTestDb(), 1);

    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/${projectFile.id}/translations?locale=en&format=mdx`,
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      "Format 'mdx' does not match the file's format 'json'. Omit the 'format' query param or set it to 'json'.",
    );
  });

  describe("markdown / mdx files", () => {
    async function createMarkdownFile(
      format: SupportedFormat,
      filePath: string,
    ): Promise<schema.ProjectFile> {
      return await createProjectFile(getTestDb(), {
        projectId: 1,
        format,
        filePath,
      });
    }

    async function saveDocumentTranslation(
      projectFileId: number,
      locale: string,
      content: string,
    ): Promise<void> {
      await getTestDb()
        .insert(schema.markdownDocumentTranslations)
        .values({ projectFileId, locale, content });
    }

    it("should return the markdown document body for the requested locale", async () => {
      await createProjectLanguage(getTestDb(), 1);
      const file = await createMarkdownFile(
        SupportedFormat.MARKDOWN,
        "docs/<lang>/intro.md",
      );
      await saveDocumentTranslation(file.id, "en", "# Hello\n\nWorld");

      const response = await callLoader(
        `https://example.com/api/orgs/test-org/projects/test-project/files/${file.id}/translations?locale=en`,
        file.id,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "text/markdown; charset=utf-8",
      );
      expect(response.headers.get("Content-Disposition")).toContain(".md");
      expect(await response.text()).toBe("# Hello\n\nWorld");
    });

    it("should return the mdx document body for the requested locale", async () => {
      await createProjectLanguage(getTestDb(), 1);
      const file = await createMarkdownFile(
        SupportedFormat.MDX,
        "docs/<lang>/intro.mdx",
      );
      await saveDocumentTranslation(
        file.id,
        "en",
        "# Hello\n\n<MyComponent />",
      );

      const response = await callLoader(
        `https://example.com/api/orgs/test-org/projects/test-project/files/${file.id}/translations?locale=en`,
        file.id,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "text/mdx; charset=utf-8",
      );
      expect(response.headers.get("Content-Disposition")).toContain(".mdx");
      expect(await response.text()).toBe("# Hello\n\n<MyComponent />");
    });

    it("should accept format=markdown when the file is a markdown file", async () => {
      await createProjectLanguage(getTestDb(), 1);
      const file = await createMarkdownFile(
        SupportedFormat.MARKDOWN,
        "docs/<lang>/intro.md",
      );
      await saveDocumentTranslation(file.id, "en", "# Hi");

      const response = await callLoader(
        `https://example.com/api/orgs/test-org/projects/test-project/files/${file.id}/translations?locale=en&format=markdown`,
        file.id,
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("# Hi");
    });

    it("should return 400 when format=json is requested on a markdown file", async () => {
      await createProjectLanguage(getTestDb(), 1);
      const file = await createMarkdownFile(
        SupportedFormat.MARKDOWN,
        "docs/<lang>/intro.md",
      );
      await saveDocumentTranslation(file.id, "en", "# Hi");

      const response = await callLoader(
        `https://example.com/api/orgs/test-org/projects/test-project/files/${file.id}/translations?locale=en&format=json`,
        file.id,
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe(
        "Format 'json' does not match the file's format 'markdown'. Omit the 'format' query param or set it to 'markdown'.",
      );
    });

    it("should return 400 when format=mdx is requested on a markdown file", async () => {
      await createProjectLanguage(getTestDb(), 1);
      const file = await createMarkdownFile(
        SupportedFormat.MARKDOWN,
        "docs/<lang>/intro.md",
      );
      await saveDocumentTranslation(file.id, "en", "# Hi");

      const response = await callLoader(
        `https://example.com/api/orgs/test-org/projects/test-project/files/${file.id}/translations?locale=en&format=mdx`,
        file.id,
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe(
        "Format 'mdx' does not match the file's format 'markdown'. Omit the 'format' query param or set it to 'markdown'.",
      );
    });

    it("should return 404 when no translation row exists for the locale", async () => {
      await createProjectLanguage(getTestDb(), 1, {
        locale: "en",
        isDefault: true,
      });
      await createProjectLanguage(getTestDb(), 1, {
        locale: "es",
        isDefault: false,
      });
      const file = await createMarkdownFile(
        SupportedFormat.MARKDOWN,
        "docs/<lang>/intro.md",
      );
      await saveDocumentTranslation(file.id, "en", "# Hi");

      const response = await callLoader(
        `https://example.com/api/orgs/test-org/projects/test-project/files/${file.id}/translations?locale=es`,
        file.id,
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("No translations found for locale 'es'");
    });
  });

  it("should use the DB file id and filePath in the XLIFF export", async () => {
    const db = getTestDb();
    await createProjectLanguage(db, 1);
    const file = await createProjectFile(db, {
      projectId: 1,
      format: SupportedFormat.XLIFF,
      filePath: "locales/<lang>/xliff.json",
    });
    await createTranslationKey(db, 1, "home.title", { fileId: file.id });
    await createTranslation(db, 1, "en", "Home");

    const response = await callLoader(
      `https://example.com/api/orgs/test-org/projects/test-project/files/${file.id}/translations?locale=en&format=xliff`,
      file.id,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/x-xliff+xml",
    );

    const text = await response.text();

    expect(text).toContain(
      `<file id="${file.id}" original="locales/en/xliff.json">`,
    );
  });
});
