import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { ImportStrategy } from "@transi-store/common";
import { db, schema } from "~/lib/db.server";
import { BRANCH_STATUS } from "../branches";

type ImportParams = {
  projectId: number;
  locale: string;
  data: Record<string, string>;
  strategy: ImportStrategy;
  branchSlug?: string;
  fileId: number;
  /**
   * Keys removed from the file since its base version. When provided on a
   * branch import, the matching main keys are marked for deletion on the
   * branch, pending deletions of keys present in `data` are cancelled, and
   * keys previously imported into the branch but missing from `data` are
   * deleted.
   */
  removedKeyNames?: Array<string>;
};

export type ImportStats = {
  total: number;
  keysCreated: number;
  translationsCreated: number;
  translationsUpdated: number;
  translationsSkipped: number;
  /** Only set when `removedKeyNames` is provided. */
  keysMarkedForDeletion?: number;
  /** Only set when `removedKeyNames` is provided. */
  keysUnmarkedForDeletion?: number;
  /** Only set when `removedKeyNames` is provided. */
  branchKeysDeleted?: number;
};

type ImportResult = {
  success: boolean;
  stats: ImportStats;
  errors: Array<string>;
};

/** Error thrown inside the import transaction to surface a clean message. */
class ImportError extends Error {}

/** PostgreSQL has a limit on the number of parameters in a single query */
const BATCH_SIZE = 500;

/**
 * Import translations from parsed data using batch operations (format-agnostic).
 * Uses INSERT ... ON CONFLICT for efficient bulk processing (~5 queries
 * instead of ~4-6 per entry).
 */
export async function importTranslations({
  projectId,
  locale,
  data,
  strategy,
  branchSlug,
  fileId,
  removedKeyNames,
}: ImportParams): Promise<ImportResult> {
  const stats: ImportStats = {
    total: 0,
    keysCreated: 0,
    translationsCreated: 0,
    translationsUpdated: 0,
    translationsSkipped: 0,
    ...(removedKeyNames && {
      keysMarkedForDeletion: 0,
      keysUnmarkedForDeletion: 0,
      branchKeysDeleted: 0,
    }),
  };

  try {
    const entries = Object.entries(data);
    stats.total = entries.length;

    if (entries.length === 0 && !removedKeyNames?.length) {
      return { success: true, stats, errors: [] };
    }

    await db.transaction(async (tx) => {
      const keyNames = entries.map(([keyName]) => keyName);

      // 1. Fetch all existing keys for this project+file in one query
      const existingKeys = await tx
        .select({
          id: schema.translationKeys.id,
          keyName: schema.translationKeys.keyName,
        })
        .from(schema.translationKeys)
        .where(
          and(
            eq(schema.translationKeys.projectId, projectId),
            eq(schema.translationKeys.fileId, fileId),
            inArray(schema.translationKeys.keyName, keyNames),
          ),
        );

      const existingKeyMap = new Map(
        existingKeys.map((k) => [k.keyName, k.id]),
      );

      // 2. Main keys removed from the file since its base version: they
      // will be marked for deletion on the branch.
      const keyIdsToMarkForDeletion =
        branchSlug && removedKeyNames?.length
          ? (
              await tx
                .select({ id: schema.translationKeys.id })
                .from(schema.translationKeys)
                .where(
                  and(
                    eq(schema.translationKeys.projectId, projectId),
                    eq(schema.translationKeys.fileId, fileId),
                    isNull(schema.translationKeys.branchId),
                    isNull(schema.translationKeys.deletedAt),
                    inArray(schema.translationKeys.keyName, removedKeyNames),
                  ),
                )
            ).map((k) => k.id)
          : [];

      // 3. Resolve the target branch only when new keys or deletions need it.
      // A branch-scoped import creates a branch key for every new key, so a
      // branch is only created when the import actually adds or deletes keys
      // — this avoids leaving empty branches behind (e.g. a `upload:config`
      // run where every translation already exists).
      let branchId: number | undefined;
      const newKeyNames = keyNames.filter((name) => !existingKeyMap.has(name));

      if (branchSlug) {
        const existingBranch = await tx.query.branches.findFirst({
          where: { projectId, slug: branchSlug },
        });

        if (existingBranch) {
          if (existingBranch.status !== BRANCH_STATUS.OPEN) {
            throw new ImportError(`Branch '${branchSlug}' is not open`);
          }
          branchId = existingBranch.id;
        } else if (
          newKeyNames.length > 0 ||
          keyIdsToMarkForDeletion.length > 0
        ) {
          const [createdBranch] = await tx
            .insert(schema.branches)
            .values({ projectId, name: branchSlug, slug: branchSlug })
            .onConflictDoNothing({
              target: [schema.branches.projectId, schema.branches.slug],
            })
            .returning();

          // ON CONFLICT DO NOTHING covers a concurrent import creating the
          // same branch first; re-fetch it in that case.
          const branch =
            createdBranch ??
            (await tx.query.branches.findFirst({
              where: { projectId, slug: branchSlug },
            }));

          if (!branch) {
            throw new ImportError(
              `Branch '${branchSlug}' not found and could not be created`,
            );
          }
          if (branch.status !== BRANCH_STATUS.OPEN) {
            throw new ImportError(`Branch '${branchSlug}' is not open`);
          }
          branchId = branch.id;
        }
      }

      // 4. Batch insert new keys (ON CONFLICT DO NOTHING)

      if (newKeyNames.length > 0) {
        for (let i = 0; i < newKeyNames.length; i += BATCH_SIZE) {
          const batch = newKeyNames.slice(i, i + BATCH_SIZE);
          const insertedKeys = await tx
            .insert(schema.translationKeys)
            .values(
              batch.map((keyName) => ({
                projectId,
                keyName,
                branchId: branchId ?? null,
                fileId,
                createdByImport: true,
              })),
            )
            .onConflictDoNothing({
              target: [
                schema.translationKeys.projectId,
                schema.translationKeys.fileId,
                schema.translationKeys.keyName,
              ],
            })
            .returning({
              id: schema.translationKeys.id,
              keyName: schema.translationKeys.keyName,
            });

          for (const key of insertedKeys) {
            existingKeyMap.set(key.keyName, key.id);
          }
        }

        stats.keysCreated = newKeyNames.length;
      }

      // 5. Build the keyName → keyId map (all keys should now exist)
      // If some keys were skipped by ON CONFLICT DO NOTHING (race condition),
      // re-fetch them
      const missingKeys = keyNames.filter((name) => !existingKeyMap.has(name));
      if (missingKeys.length > 0) {
        const refetchedKeys = await tx
          .select({
            id: schema.translationKeys.id,
            keyName: schema.translationKeys.keyName,
          })
          .from(schema.translationKeys)
          .where(
            and(
              eq(schema.translationKeys.projectId, projectId),
              eq(schema.translationKeys.fileId, fileId),
              inArray(schema.translationKeys.keyName, missingKeys),
            ),
          );
        for (const key of refetchedKeys) {
          existingKeyMap.set(key.keyName, key.id);
        }
      }

      // 6. Fetch existing translations for these keys + locale in one query
      const allKeyIds = [...existingKeyMap.values()];
      const existingTranslations = await tx
        .select({ keyId: schema.translations.keyId })
        .from(schema.translations)
        .where(
          and(
            inArray(schema.translations.keyId, allKeyIds),
            eq(schema.translations.locale, locale),
          ),
        );

      const existingTranslationKeyIds = new Set(
        existingTranslations.map((t) => t.keyId),
      );

      // 7. Batch upsert translations based on strategy
      // Filter out empty string values: empty translations are not meaningful
      const translationValues = entries
        .filter(([, value]) => value !== "")
        .map(([keyName, value]) => ({
          keyId: existingKeyMap.get(keyName)!,
          locale,
          value,
          isFuzzy: false,
        }));

      if (strategy === ImportStrategy.OVERWRITE) {
        // INSERT ... ON CONFLICT DO UPDATE for all entries
        for (let i = 0; i < translationValues.length; i += BATCH_SIZE) {
          const batch = translationValues.slice(i, i + BATCH_SIZE);
          await tx
            .insert(schema.translations)
            .values(batch)
            .onConflictDoUpdate({
              target: [schema.translations.keyId, schema.translations.locale],
              set: {
                value: sql`excluded.value`,
                updatedAt: sql`now()`,
              },
            });
        }

        // Count stats based on what existed before (skip empty values)
        for (const [keyName, value] of entries) {
          if (value === "") continue;
          const keyId = existingKeyMap.get(keyName)!;
          if (existingTranslationKeyIds.has(keyId)) {
            stats.translationsUpdated++;
          } else {
            stats.translationsCreated++;
          }
        }
      } else {
        // SKIP strategy: INSERT ... ON CONFLICT DO NOTHING (only create new)
        const newTranslations = translationValues.filter(
          (t) => !existingTranslationKeyIds.has(t.keyId),
        );

        if (newTranslations.length > 0) {
          for (let i = 0; i < newTranslations.length; i += BATCH_SIZE) {
            const batch = newTranslations.slice(i, i + BATCH_SIZE);
            await tx
              .insert(schema.translations)
              .values(batch)
              .onConflictDoNothing({
                target: [schema.translations.keyId, schema.translations.locale],
              });
          }
        }

        stats.translationsCreated = newTranslations.length;
        stats.translationsSkipped = entries.length - newTranslations.length;
      }

      // 8. Sync the branch deletions with the file: mark the removed keys,
      // cancel the pending deletion of keys that are back in the file, and
      // delete the keys previously imported into the branch that are no
      // longer in the file.
      if (removedKeyNames && branchId !== undefined) {
        let keysMarkedForDeletion = 0;
        for (let i = 0; i < keyIdsToMarkForDeletion.length; i += BATCH_SIZE) {
          const batch = keyIdsToMarkForDeletion.slice(i, i + BATCH_SIZE);
          const marked = await tx
            .insert(schema.branchKeyDeletions)
            .values(
              batch.map((translationKeyId) => ({ branchId, translationKeyId })),
            )
            .onConflictDoNothing()
            .returning({ id: schema.branchKeyDeletions.id });

          keysMarkedForDeletion += marked.length;
        }
        stats.keysMarkedForDeletion = keysMarkedForDeletion;

        if (allKeyIds.length > 0) {
          const unmarked = await tx
            .delete(schema.branchKeyDeletions)
            .where(
              and(
                eq(schema.branchKeyDeletions.branchId, branchId),
                inArray(schema.branchKeyDeletions.translationKeyId, allKeyIds),
              ),
            )
            .returning({ id: schema.branchKeyDeletions.id });

          stats.keysUnmarkedForDeletion = unmarked.length;
        }

        // These keys never reached main, so they are deleted right away (with
        // their translations). Keys created from the UI are kept: they may
        // not have been added to the file yet.
        const deletedBranchKeys = await tx
          .delete(schema.translationKeys)
          .where(
            and(
              eq(schema.translationKeys.projectId, projectId),
              eq(schema.translationKeys.fileId, fileId),
              eq(schema.translationKeys.branchId, branchId),
              eq(schema.translationKeys.createdByImport, true),
              notInArray(schema.translationKeys.keyName, keyNames),
            ),
          )
          .returning({ id: schema.translationKeys.id });

        stats.branchKeysDeleted = deletedBranchKeys.length;
      }
    });

    return {
      success: true,
      stats,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      stats,
      errors: [
        // TODO translate
        error instanceof Error ? error.message : "Erreur lors de l'import",
      ],
    };
  }
}
