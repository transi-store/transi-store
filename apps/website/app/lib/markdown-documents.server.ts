/**
 * Server-side data access for markdown / MDX translation documents.
 *
 * Storage model: a `markdownDocument` per `projectFile`, one
 * `markdownDocumentTranslations` row per locale (full document body in
 * `content`), and a sidecar `markdownSectionStates` table holding per-section
 * metadata (isFuzzy, last AI translation timestamp). The sidecar is
 * reconciled on every save in the same transaction as the content upsert.
 */
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { SupportedFormat, isDocumentFormat } from "@transi-store/common";
import { db, schema } from "./db.server";
import type {
  MarkdownDocument,
  MarkdownDocumentTranslation,
  MarkdownSectionState,
  ProjectFile,
} from "../../drizzle/schema";
import { parseSections, type Section } from "./markdown-sections";

export type DocumentWithFile = {
  document: MarkdownDocument;
  projectFile: ProjectFile;
};

function mdxFromFormat(format: string): boolean {
  return format === SupportedFormat.MDX;
}

/**
 * Resolve (or create) the markdown document tied to a project file. The file
 * must have a document format (markdown / mdx); other formats throw.
 *
 * Caller is responsible for verifying that the project belongs to the
 * authenticated organization.
 */
export async function getOrCreateDocumentForFile(
  projectFile: ProjectFile,
): Promise<MarkdownDocument> {
  if (!isDocumentFormat(projectFile.format)) {
    throw new Error(
      `Project file ${projectFile.id} is not a document format (got ${projectFile.format})`,
    );
  }

  const existing = await db.query.markdownDocuments.findFirst({
    where: { projectFileId: projectFile.id },
  });
  if (existing) return existing;

  const [created] = await db
    .insert(schema.markdownDocuments)
    .values({ projectFileId: projectFile.id })
    .returning();
  return created;
}

export async function getDocumentTranslations(
  documentId: number,
): Promise<MarkdownDocumentTranslation[]> {
  return await db.query.markdownDocumentTranslations.findMany({
    where: { documentId },
    orderBy: (t, { asc }) => [asc(t.locale)],
  });
}

export async function getSectionStates(
  documentId: number,
  locale?: string,
): Promise<MarkdownSectionState[]> {
  return await db.query.markdownSectionStates.findMany({
    where: locale ? { documentId, locale } : { documentId },
  });
}

/**
 * Save the body of a translation for a given locale. In the same transaction:
 * 1. Upsert the `markdownDocumentTranslations` row for (documentId, locale).
 * 2. Reparse the new content to compute the set of valid `structuralPath`s.
 * 3. Delete any sidecar `markdownSectionStates` row for this locale whose
 *    `structuralPath` no longer exists in the document.
 *
 * Returns the persisted translation row and the freshly parsed sections.
 */
export async function saveDocumentTranslation(params: {
  documentId: number;
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
      where: { documentId: params.documentId, locale: params.locale },
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
          documentId: params.documentId,
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
          and(
            eq(schema.markdownSectionStates.documentId, params.documentId),
            eq(schema.markdownSectionStates.locale, params.locale),
          ),
        );
    } else {
      await tx
        .delete(schema.markdownSectionStates)
        .where(
          and(
            eq(schema.markdownSectionStates.documentId, params.documentId),
            eq(schema.markdownSectionStates.locale, params.locale),
            notInArray(schema.markdownSectionStates.structuralPath, validPaths),
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

/**
 * Toggle the `isFuzzy` flag on a section. Inserts a sidecar row when none
 * exists yet for this (document, locale, structuralPath).
 */
export async function setSectionFuzzy(params: {
  documentId: number;
  locale: string;
  structuralPath: string;
  isFuzzy: boolean;
}): Promise<MarkdownSectionState> {
  const existing = await db.query.markdownSectionStates.findFirst({
    where: {
      documentId: params.documentId,
      locale: params.locale,
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
      documentId: params.documentId,
      locale: params.locale,
      structuralPath: params.structuralPath,
      isFuzzy: params.isFuzzy,
    })
    .returning();
  return inserted;
}

/**
 * Record that a section was just translated by AI; clears `isFuzzy` and
 * stamps `lastAiTranslatedAt`. Idempotent; creates the sidecar row if missing.
 */
export async function recordAiTranslation(params: {
  documentId: number;
  locale: string;
  structuralPath: string;
}): Promise<MarkdownSectionState> {
  const existing = await db.query.markdownSectionStates.findFirst({
    where: {
      documentId: params.documentId,
      locale: params.locale,
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
      documentId: params.documentId,
      locale: params.locale,
      structuralPath: params.structuralPath,
      isFuzzy: false,
      lastAiTranslatedAt: now,
    })
    .returning();
  return inserted;
}

/**
 * Delete all sidecar rows for a list of structural paths. Used when bulk-
 * dropping outdated metadata after a manual reorganization.
 */
export async function deleteSectionStates(params: {
  documentId: number;
  locale: string;
  structuralPaths: string[];
}): Promise<void> {
  if (params.structuralPaths.length === 0) return;
  await db
    .delete(schema.markdownSectionStates)
    .where(
      and(
        eq(schema.markdownSectionStates.documentId, params.documentId),
        eq(schema.markdownSectionStates.locale, params.locale),
        inArray(
          schema.markdownSectionStates.structuralPath,
          params.structuralPaths,
        ),
      ),
    );
}
