/**
 * Server-side data access for markdown / MDX translation documents.
 *
 * Storage model: one `markdownDocumentTranslations` row per
 * (projectFileId, locale) — full document body in `content` — and a sidecar
 * `markdownSectionStates` table holding per-section metadata (isFuzzy, last
 * AI translation timestamp), keyed directly by the translation row id.
 * The sidecar is reconciled on every save in the same transaction as the
 * content upsert.
 */
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { SupportedFormat, isDocumentFormat } from "@transi-store/common";
import { db, schema } from "./db.server";
import type {
  MarkdownDocumentTranslation,
  MarkdownSectionState,
  ProjectFile,
} from "../../drizzle/schema";
import { parseSections, type Section } from "./markdown-sections";

function mdxFromFormat(format: string): boolean {
  return format === SupportedFormat.MDX;
}

function ensureDocumentFormat(projectFile: ProjectFile): void {
  if (!isDocumentFormat(projectFile.format)) {
    throw new Error(
      `Project file ${projectFile.id} is not a document format (got ${projectFile.format})`,
    );
  }
}

/**
 * List all locale rows for a markdown / MDX project file. Caller is
 * responsible for verifying that the project file belongs to the
 * authenticated organization.
 */
export async function getProjectFileTranslations(
  projectFileId: number,
): Promise<MarkdownDocumentTranslation[]> {
  return await db.query.markdownDocumentTranslations.findMany({
    where: { projectFileId },
    orderBy: (t, { asc }) => [asc(t.locale)],
  });
}

/**
 * Bulk-fetch the section states for a list of translation rows. Returns an
 * empty array when the list is empty.
 */
export async function getSectionStatesForTranslations(
  translationIds: number[],
): Promise<MarkdownSectionState[]> {
  if (translationIds.length === 0) return [];
  return await db.query.markdownSectionStates.findMany({
    where: { documentTranslationId: { in: translationIds } },
  });
}

/**
 * Save the body of a translation for a given (projectFile, locale). In the
 * same transaction:
 * 1. Upsert the `markdownDocumentTranslations` row.
 * 2. Reparse the new content to compute the set of valid `structuralPath`s.
 * 3. Delete any sidecar `markdownSectionStates` row for this translation
 *    whose `structuralPath` no longer exists in the document.
 *
 * Returns the persisted translation row and the freshly parsed sections.
 */
export async function saveDocumentTranslation(params: {
  projectFileId: number;
  locale: string;
  content: string;
  format: SupportedFormat;
  /** When provided, the upsert is rejected if the row's updatedAt has moved. */
  expectedUpdatedAt?: Date | null;
}): Promise<{
  translation: MarkdownDocumentTranslation;
  sections: Section[];
}> {
  const sections = parseSections(params.content, {
    mdx: mdxFromFormat(params.format),
  });
  const validPaths = sections.map((s) => s.structuralPath);

  return await db.transaction(async (tx) => {
    const existing = await tx.query.markdownDocumentTranslations.findFirst({
      where: {
        projectFileId: params.projectFileId,
        locale: params.locale,
      },
    });

    if (
      params.expectedUpdatedAt !== undefined &&
      existing &&
      existing.updatedAt.getTime() !== (params.expectedUpdatedAt?.getTime() ?? 0)
    ) {
      throw new MarkdownDocumentConflictError();
    }

    let translation: MarkdownDocumentTranslation;
    if (existing) {
      const [updated] = await tx
        .update(schema.markdownDocumentTranslations)
        .set({ content: params.content, updatedAt: new Date() })
        .where(eq(schema.markdownDocumentTranslations.id, existing.id))
        .returning();
      translation = updated;
    } else {
      const [inserted] = await tx
        .insert(schema.markdownDocumentTranslations)
        .values({
          projectFileId: params.projectFileId,
          locale: params.locale,
          content: params.content,
        })
        .returning();
      translation = inserted;
    }

    // Reconcile sidecar: drop entries whose structuralPath no longer exists.
    if (validPaths.length === 0) {
      await tx
        .delete(schema.markdownSectionStates)
        .where(
          eq(
            schema.markdownSectionStates.documentTranslationId,
            translation.id,
          ),
        );
    } else {
      await tx
        .delete(schema.markdownSectionStates)
        .where(
          and(
            eq(
              schema.markdownSectionStates.documentTranslationId,
              translation.id,
            ),
            notInArray(
              schema.markdownSectionStates.structuralPath,
              validPaths,
            ),
          ),
        );
    }

    return { translation, sections };
  });
}

export class MarkdownDocumentConflictError extends Error {
  constructor() {
    super("Document was modified by another save; reload and try again.");
    this.name = "MarkdownDocumentConflictError";
  }
}

export class MarkdownTranslationMissingError extends Error {
  constructor(projectFileId: number, locale: string) {
    super(
      `No translation row exists yet for projectFile=${projectFileId} locale=${locale}; save content first.`,
    );
    this.name = "MarkdownTranslationMissingError";
  }
}

async function findTranslation(
  projectFileId: number,
  locale: string,
): Promise<MarkdownDocumentTranslation> {
  const row = await db.query.markdownDocumentTranslations.findFirst({
    where: { projectFileId, locale },
  });
  if (!row) throw new MarkdownTranslationMissingError(projectFileId, locale);
  return row;
}

/**
 * Toggle the `isFuzzy` flag on a section. Inserts a sidecar row when none
 * exists yet for this (translation, structuralPath). The translation row
 * must already exist (the user has saved content at least once).
 */
export async function setSectionFuzzy(params: {
  projectFileId: number;
  locale: string;
  structuralPath: string;
  isFuzzy: boolean;
}): Promise<MarkdownSectionState> {
  const translation = await findTranslation(params.projectFileId, params.locale);
  const existing = await db.query.markdownSectionStates.findFirst({
    where: {
      documentTranslationId: translation.id,
      structuralPath: params.structuralPath,
    },
  });

  if (existing) {
    const [updated] = await db
      .update(schema.markdownSectionStates)
      .set({ isFuzzy: params.isFuzzy, updatedAt: new Date() })
      .where(eq(schema.markdownSectionStates.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(schema.markdownSectionStates)
    .values({
      documentTranslationId: translation.id,
      structuralPath: params.structuralPath,
      isFuzzy: params.isFuzzy,
    })
    .returning();
  return inserted;
}

/**
 * Record that a section was just translated by AI; clears `isFuzzy` and
 * stamps `lastAiTranslatedAt`. Idempotent; creates the sidecar row if
 * missing. The translation row must already exist.
 */
export async function recordAiTranslation(params: {
  projectFileId: number;
  locale: string;
  structuralPath: string;
}): Promise<MarkdownSectionState> {
  const translation = await findTranslation(params.projectFileId, params.locale);
  const existing = await db.query.markdownSectionStates.findFirst({
    where: {
      documentTranslationId: translation.id,
      structuralPath: params.structuralPath,
    },
  });

  const now = new Date();
  if (existing) {
    const [updated] = await db
      .update(schema.markdownSectionStates)
      .set({
        isFuzzy: false,
        lastAiTranslatedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.markdownSectionStates.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(schema.markdownSectionStates)
    .values({
      documentTranslationId: translation.id,
      structuralPath: params.structuralPath,
      isFuzzy: false,
      lastAiTranslatedAt: now,
    })
    .returning();
  return inserted;
}

/**
 * Delete a list of sidecar rows for a translation. Used when bulk-dropping
 * outdated metadata after a manual reorganization.
 */
export async function deleteSectionStates(params: {
  documentTranslationId: number;
  structuralPaths: string[];
}): Promise<void> {
  if (params.structuralPaths.length === 0) return;
  await db
    .delete(schema.markdownSectionStates)
    .where(
      and(
        eq(
          schema.markdownSectionStates.documentTranslationId,
          params.documentTranslationId,
        ),
        inArray(
          schema.markdownSectionStates.structuralPath,
          params.structuralPaths,
        ),
      ),
    );
}

/**
 * Validate that the project file uses a document format, throwing otherwise.
 * Exposed for routes/endpoints that resolve the file before delegating here.
 */
export function assertDocumentFormat(projectFile: ProjectFile): void {
  ensureDocumentFormat(projectFile);
}
