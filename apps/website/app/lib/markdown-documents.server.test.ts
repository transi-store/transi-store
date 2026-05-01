import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and } from "drizzle-orm";
import { SupportedFormat } from "@transi-store/common";
import * as schema from "../../drizzle/schema";
import {
  getTestDb,
  cleanupDb,
  createOrganization,
  createProject,
  createProjectFile,
  type TestDb,
} from "../../tests/test-db";
import {
  saveDocumentTranslation,
  setSectionFuzzy,
  recordAiTranslation,
  getProjectFileTranslations,
  getDocumentTranslation,
  getSectionStatesForTranslations,
  MarkdownDocumentConflictError,
  MarkdownTranslationMissingError,
} from "./markdown-documents.server";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

const SOURCE_DOC = [
  "# Intro",
  "",
  "Hello.",
  "",
  "## Why",
  "",
  "Reasons.",
  "",
  "## How",
  "",
  "Steps.",
].join("\n");

describe("markdown-documents.server", () => {
  let db: TestDb;
  let projectFileId: number;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();
    const org = await createOrganization(db);
    const project = await createProject(db, org.id);
    const file = await createProjectFile(db, {
      projectId: project.id,
      format: SupportedFormat.MARKDOWN,
      filePath: "docs/<lang>/intro.md",
    });
    projectFileId = file.id;
  });

  describe("saveDocumentTranslation", () => {
    it("inserts a new translation row when none exists", async () => {
      const { translation, sections } = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      expect(translation.id).toBeGreaterThan(0);
      expect(translation.locale).toBe("en");
      expect(translation.content).toBe(SOURCE_DOC);
      // Three sections: h1:0, h1:0/h2:0, h1:0/h2:1
      expect(sections.map((s) => s.structuralPath)).toEqual([
        "h1:0",
        "h1:0/h2:0",
        "h1:0/h2:1",
      ]);
    });

    it("updates content and bumps updatedAt when the row already exists", async () => {
      const first = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      // Wait a tick so updatedAt actually moves.
      await new Promise((r) => setTimeout(r, 5));

      const second = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC + "\n\n## More\n\nExtra.",
        format: SupportedFormat.MARKDOWN,
      });

      expect(second.translation.id).toBe(first.translation.id);
      expect(second.translation.content).toContain("## More");
      expect(second.translation.updatedAt.getTime()).toBeGreaterThanOrEqual(
        first.translation.updatedAt.getTime(),
      );
    });

    it("rejects the save when expectedUpdatedAt does not match", async () => {
      const first = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      const stale = new Date(first.translation.updatedAt.getTime() - 1000);

      await expect(
        saveDocumentTranslation({
          projectFileId,
          locale: "en",
          content: SOURCE_DOC + "\n\nmore",
          format: SupportedFormat.MARKDOWN,
          expectedUpdatedAt: stale,
        }),
      ).rejects.toBeInstanceOf(MarkdownDocumentConflictError);
    });

    it("accepts the save when expectedUpdatedAt matches the current row", async () => {
      const first = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      const second = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC + "\n\nappended",
        format: SupportedFormat.MARKDOWN,
        expectedUpdatedAt: first.translation.updatedAt,
      });

      expect(second.translation.content).toContain("appended");
    });

    it("ignores expectedUpdatedAt on the very first insert", async () => {
      // No row yet — `expectedUpdatedAt` cannot conflict with anything.
      const result = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
        expectedUpdatedAt: new Date(0),
      });
      expect(result.translation.id).toBeGreaterThan(0);
    });

    it("reconciles the sidecar by dropping rows for paths that no longer exist", async () => {
      const first = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      // Seed sidecar entries for every section.
      for (const path of ["h1:0", "h1:0/h2:0", "h1:0/h2:1"]) {
        await db.insert(schema.markdownSectionStates).values({
          documentTranslationId: first.translation.id,
          structuralPath: path,
          isFuzzy: true,
        });
      }

      // Save a document that drops `## How` (h1:0/h2:1).
      const trimmed = [
        "# Intro",
        "",
        "Hello.",
        "",
        "## Why",
        "",
        "Reasons.",
      ].join("\n");
      await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: trimmed,
        format: SupportedFormat.MARKDOWN,
      });

      const states = await getSectionStatesForTranslations([
        first.translation.id,
      ]);
      expect(states.map((s) => s.structuralPath).sort()).toEqual([
        "h1:0",
        "h1:0/h2:0",
      ]);
    });

    it("clears all sidecar rows when the document becomes empty", async () => {
      const first = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });
      await db.insert(schema.markdownSectionStates).values({
        documentTranslationId: first.translation.id,
        structuralPath: "h1:0",
        isFuzzy: true,
      });

      await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: "",
        format: SupportedFormat.MARKDOWN,
      });

      const states = await getSectionStatesForTranslations([
        first.translation.id,
      ]);
      expect(states).toEqual([]);
    });

    it("parses MDX when the format is MDX", async () => {
      const mdx = "# Title\n\n<Callout>Hi {name}!</Callout>\n";
      const result = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: mdx,
        format: SupportedFormat.MDX,
      });
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.sections[0].structuralPath).toBe("h1:0");
    });

    it("isolates rows across locales for the same project file", async () => {
      await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });
      await saveDocumentTranslation({
        projectFileId,
        locale: "fr",
        content: "# Intro\n\nBonjour.",
        format: SupportedFormat.MARKDOWN,
      });

      const rows = await getProjectFileTranslations(projectFileId);
      expect(rows.map((r) => r.locale).sort()).toEqual(["en", "fr"]);
    });
  });

  describe("setSectionFuzzy", () => {
    it("throws MarkdownTranslationMissingError when no row exists yet", async () => {
      await expect(
        setSectionFuzzy({
          projectFileId,
          locale: "en",
          structuralPath: "h1:0",
          isFuzzy: true,
        }),
      ).rejects.toBeInstanceOf(MarkdownTranslationMissingError);
    });

    it("inserts a sidecar row on first call", async () => {
      await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      const state = await setSectionFuzzy({
        projectFileId,
        locale: "en",
        structuralPath: "h1:0/h2:0",
        isFuzzy: true,
      });
      expect(state.isFuzzy).toBe(true);
      expect(state.structuralPath).toBe("h1:0/h2:0");
    });

    it("updates the existing row instead of creating a duplicate", async () => {
      await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      const a = await setSectionFuzzy({
        projectFileId,
        locale: "en",
        structuralPath: "h1:0",
        isFuzzy: true,
      });
      const b = await setSectionFuzzy({
        projectFileId,
        locale: "en",
        structuralPath: "h1:0",
        isFuzzy: false,
      });

      expect(b.id).toBe(a.id);
      expect(b.isFuzzy).toBe(false);

      const all = await db
        .select()
        .from(schema.markdownSectionStates)
        .where(
          and(
            eq(
              schema.markdownSectionStates.documentTranslationId,
              a.documentTranslationId,
            ),
            eq(schema.markdownSectionStates.structuralPath, "h1:0"),
          ),
        );
      expect(all).toHaveLength(1);
    });
  });

  describe("recordAiTranslation", () => {
    it("throws MarkdownTranslationMissingError when no row exists yet", async () => {
      await expect(
        recordAiTranslation({
          projectFileId,
          locale: "en",
          structuralPath: "h1:0",
        }),
      ).rejects.toBeInstanceOf(MarkdownTranslationMissingError);
    });

    it("inserts a sidecar row, clears fuzzy, and stamps lastAiTranslatedAt", async () => {
      await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      const state = await recordAiTranslation({
        projectFileId,
        locale: "en",
        structuralPath: "h1:0",
      });
      expect(state.isFuzzy).toBe(false);
      expect(state.lastAiTranslatedAt).toBeInstanceOf(Date);
    });

    it("clears a previously fuzzy flag on the same path", async () => {
      await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });
      await setSectionFuzzy({
        projectFileId,
        locale: "en",
        structuralPath: "h1:0/h2:0",
        isFuzzy: true,
      });

      const state = await recordAiTranslation({
        projectFileId,
        locale: "en",
        structuralPath: "h1:0/h2:0",
      });
      expect(state.isFuzzy).toBe(false);
      expect(state.lastAiTranslatedAt).toBeInstanceOf(Date);
    });
  });

  describe("getDocumentTranslation", () => {
    it("returns undefined when no row exists for the (file, locale)", async () => {
      const result = await getDocumentTranslation(projectFileId, "en");
      expect(result).toBeUndefined();
    });

    it("returns the saved row for the requested locale", async () => {
      await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      const result = await getDocumentTranslation(projectFileId, "en");
      expect(result).toBeDefined();
      expect(result?.locale).toBe("en");
      expect(result?.content).toBe(SOURCE_DOC);
    });

    it("does not return rows from other locales", async () => {
      await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      const result = await getDocumentTranslation(projectFileId, "fr");
      expect(result).toBeUndefined();
    });

    it("does not return rows from other project files", async () => {
      await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      const otherFile = await createProjectFile(db, {
        projectId: 1,
        format: SupportedFormat.MARKDOWN,
        filePath: "docs/<lang>/other.md",
      });

      const result = await getDocumentTranslation(otherFile.id, "en");
      expect(result).toBeUndefined();
    });
  });

  describe("getSectionStatesForTranslations", () => {
    it("returns an empty array when given no ids", async () => {
      const result = await getSectionStatesForTranslations([]);
      expect(result).toEqual([]);
    });

    it("bulk-fetches states for multiple translations", async () => {
      const en = await saveDocumentTranslation({
        projectFileId,
        locale: "en",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });
      const fr = await saveDocumentTranslation({
        projectFileId,
        locale: "fr",
        content: SOURCE_DOC,
        format: SupportedFormat.MARKDOWN,
      });

      await setSectionFuzzy({
        projectFileId,
        locale: "en",
        structuralPath: "h1:0",
        isFuzzy: true,
      });
      await setSectionFuzzy({
        projectFileId,
        locale: "fr",
        structuralPath: "h1:0/h2:0",
        isFuzzy: true,
      });

      const states = await getSectionStatesForTranslations([
        en.translation.id,
        fr.translation.id,
      ]);
      expect(states).toHaveLength(2);
    });
  });
});
