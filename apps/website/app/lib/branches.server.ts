import type { Branch, TranslationKey } from "../../drizzle/schema";
import { BRANCH_STATUS, MERGE_FAILURE_REASON } from "./branches";
import { db, schema } from "./db.server";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

export async function getBranchesByProject(projectId: number) {
  return await db.query.branches.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBranchBySlug(projectId: number, slug: string) {
  return await db.query.branches.findFirst({
    where: { projectId, slug },
  });
}

async function getBranchById(branchId: number) {
  return await db.query.branches.findFirst({
    where: { id: branchId },
  });
}

export async function isBranchSlugAvailable(
  projectId: number,
  slug: string,
): Promise<boolean> {
  const existing = await db.query.branches.findFirst({
    where: { projectId, slug },
  });
  return !existing;
}

type CreateBranchParams = {
  projectId: number;
  name: string;
  slug: string;
  description?: string;
  createdBy?: number;
};

export async function createBranch(
  params: CreateBranchParams,
): Promise<Branch> {
  const [branch] = await db
    .insert(schema.branches)
    .values({
      projectId: params.projectId,
      name: params.name,
      slug: params.slug,
      description: params.description,
      createdBy: params.createdBy,
    })
    .returning();

  return branch;
}

export async function deleteBranch(branchId: number): Promise<void> {
  // CASCADE will delete associated translation_keys and their translations
  await db.delete(schema.branches).where(eq(schema.branches.id, branchId));
}

type TranslationKeyWithFilePath = TranslationKey & { filePath: string };

export async function getBranchKeys(
  branchId: number,
): Promise<Array<TranslationKeyWithFilePath>> {
  const rows = await db
    .select({
      key: schema.translationKeys,
      filePath: schema.projectFiles.filePath,
    })
    .from(schema.translationKeys)
    .innerJoin(
      schema.projectFiles,
      eq(schema.translationKeys.fileId, schema.projectFiles.id),
    )
    .where(eq(schema.translationKeys.branchId, branchId))
    .orderBy(schema.translationKeys.keyName);

  return rows.map((row) => ({ ...row.key, filePath: row.filePath }));
}

export async function getBranchKeyCount(branchId: number): Promise<number> {
  return await db.$count(
    schema.translationKeys,
    eq(schema.translationKeys.branchId, branchId),
  );
}

type MergeBranchResult =
  | {
      success: true;
      keysMoved: number;
      keysDeleted: number;
      into: string | null;
    }
  | {
      success: false;
      reason: MERGE_FAILURE_REASON;
      error: string;
    };

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Returns the open branch a merge into `slug` lands on, or null for main:
// a missing branch is created, and a merged branch is followed down to the
// branch it was merged into.
async function resolveMergeTarget(
  tx: Transaction,
  projectId: number,
  slug: string,
): Promise<Branch | null> {
  await tx
    .insert(schema.branches)
    .values({ projectId, name: slug, slug })
    .onConflictDoNothing({
      target: [schema.branches.projectId, schema.branches.slug],
    });

  let target = await tx.query.branches.findFirst({
    where: { projectId, slug },
  });

  while (target?.status === BRANCH_STATUS.MERGED) {
    target =
      target.mergedIntoBranchId === null
        ? undefined
        : await tx.query.branches.findFirst({
            where: { id: target.mergedIntoBranchId },
          });
  }

  return target ?? null;
}

// Merges the branch into main, or into the branch `into` when given: its keys
// move to the target, and its pending deletions are applied on main or carried
// over to the target branch.
// Merging a branch never produces a key conflict: the unique index
// `unique_project_file_key` on (project_id, file_id, key_name) prevents two
// branches, or a branch and main, from holding the same key.
export async function mergeBranch(
  branchId: number,
  mergedBy: number | null,
  into?: string,
): Promise<MergeBranchResult> {
  const branch = await getBranchById(branchId);
  if (!branch) {
    return {
      success: false,
      reason: MERGE_FAILURE_REASON.NOT_FOUND,
      error: "Branch not found",
    };
  }

  if (branch.status !== BRANCH_STATUS.OPEN) {
    return {
      success: false,
      reason: MERGE_FAILURE_REASON.NOT_OPEN,
      error: "Branch is not open",
    };
  }

  const merged = await db.transaction(async (tx) => {
    const target =
      into === undefined
        ? null
        : await resolveMergeTarget(tx, branch.projectId, into);

    if (target?.id === branchId) {
      return null;
    }

    const targetBranchId = target?.id ?? null;

    const movedKeys = await tx
      .update(schema.translationKeys)
      .set({ branchId: targetBranchId })
      .where(eq(schema.translationKeys.branchId, branchId))
      .returning({ id: schema.translationKeys.id });

    const deletions = await tx
      .delete(schema.branchKeyDeletions)
      .where(eq(schema.branchKeyDeletions.branchId, branchId))
      .returning({
        translationKeyId: schema.branchKeyDeletions.translationKeyId,
      });

    if (deletions.length > 0) {
      const deletionKeyIds = deletions.map((d) => d.translationKeyId);

      if (targetBranchId === null) {
        await tx
          .update(schema.translationKeys)
          .set({ deletedAt: new Date() })
          .where(inArray(schema.translationKeys.id, deletionKeyIds));
      } else {
        await tx
          .insert(schema.branchKeyDeletions)
          .values(
            deletionKeyIds.map((translationKeyId) => ({
              branchId: targetBranchId,
              translationKeyId,
            })),
          )
          .onConflictDoNothing();
      }
    }

    await tx
      .update(schema.branches)
      .set({
        status: BRANCH_STATUS.MERGED,
        mergedBy,
        mergedAt: new Date(),
        mergedIntoBranchId: targetBranchId,
      })
      .where(eq(schema.branches.id, branchId));

    return {
      keysMoved: movedKeys.length,
      keysDeleted: deletions.length,
      into: target?.slug ?? null,
    };
  });

  if (!merged) {
    return {
      success: false,
      reason: MERGE_FAILURE_REASON.INTO_ITSELF,
      error: "A branch cannot be merged into itself",
    };
  }

  return { success: true, ...merged };
}

// --- Branch Key Deletions ---

export async function addKeyDeletionsToBranch(
  branchId: number,
  translationKeyIds: number[],
): Promise<void> {
  if (translationKeyIds.length === 0) return;

  await db
    .insert(schema.branchKeyDeletions)
    .values(
      translationKeyIds.map((translationKeyId) => ({
        branchId,
        translationKeyId,
      })),
    )
    .onConflictDoNothing();
}

export async function removeKeyDeletionFromBranch(
  branchId: number,
  translationKeyId: number,
): Promise<void> {
  await db
    .delete(schema.branchKeyDeletions)
    .where(
      and(
        eq(schema.branchKeyDeletions.branchId, branchId),
        eq(schema.branchKeyDeletions.translationKeyId, translationKeyId),
      ),
    );
}

export async function getBranchKeyDeletions(
  branchId: number,
  options?: { fileId?: number },
): Promise<Array<TranslationKeyWithFilePath>> {
  const deletions = await db
    .select({ translationKeyId: schema.branchKeyDeletions.translationKeyId })
    .from(schema.branchKeyDeletions)
    .where(eq(schema.branchKeyDeletions.branchId, branchId));

  if (deletions.length === 0) return [];

  const rows = await db
    .select({
      key: schema.translationKeys,
      filePath: schema.projectFiles.filePath,
    })
    .from(schema.translationKeys)
    .innerJoin(
      schema.projectFiles,
      eq(schema.translationKeys.fileId, schema.projectFiles.id),
    )
    .where(
      and(
        inArray(
          schema.translationKeys.id,
          deletions.map((d) => d.translationKeyId),
        ),
        options?.fileId !== undefined
          ? eq(schema.translationKeys.fileId, options.fileId)
          : undefined,
      ),
    )
    .orderBy(schema.translationKeys.keyName);

  return rows.map((row) => ({ ...row.key, filePath: row.filePath }));
}

export async function getBranchKeyDeletionCount(
  branchId: number,
  options?: { fileId?: number },
): Promise<number> {
  if (options?.fileId === undefined) {
    return await db.$count(
      schema.branchKeyDeletions,
      eq(schema.branchKeyDeletions.branchId, branchId),
    );
  }

  const rows = await db
    .select({ id: schema.branchKeyDeletions.id })
    .from(schema.branchKeyDeletions)
    .innerJoin(
      schema.translationKeys,
      eq(schema.branchKeyDeletions.translationKeyId, schema.translationKeys.id),
    )
    .where(
      and(
        eq(schema.branchKeyDeletions.branchId, branchId),
        eq(schema.translationKeys.fileId, options.fileId),
      ),
    );

  return rows.length;
}

/**
 * Search main keys that can be marked for deletion in a branch.
 * Excludes keys already marked for deletion in this branch.
 */
export async function searchMainKeysForDeletion(
  projectId: number,
  branchId: number,
  fileId: number,
  options?: { search?: string; limit?: number; offset?: number },
): Promise<{ data: TranslationKey[]; count: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  // Get already-marked key IDs to exclude them
  const alreadyMarked = await db
    .select({ translationKeyId: schema.branchKeyDeletions.translationKeyId })
    .from(schema.branchKeyDeletions)
    .where(eq(schema.branchKeyDeletions.branchId, branchId));

  const alreadyMarkedIds = alreadyMarked.map((d) => d.translationKeyId);

  const conditions = [
    eq(schema.translationKeys.projectId, projectId),
    eq(schema.translationKeys.fileId, fileId),
    isNull(schema.translationKeys.branchId),
    isNull(schema.translationKeys.deletedAt),
  ];

  if (alreadyMarkedIds.length > 0) {
    conditions.push(notInArray(schema.translationKeys.id, alreadyMarkedIds));
  }

  // A deletion search always carries a query, so results are ordered by
  // relevance. The query-less path (filtering unit tests only) needs no order.
  let relevanceOrder: SQL | undefined;

  if (options?.search) {
    const searchQuery = options.search;
    const SIMILARITY_THRESHOLD = 0.3;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle column type is complex
    const maxSimilarity = (field: any) =>
      sql<number>`GREATEST(
        similarity(${field}, ${searchQuery}),
        word_similarity(${searchQuery}, ${field})
      )`;

    conditions.push(
      or(
        sql`${maxSimilarity(schema.translationKeys.keyName)} > ${SIMILARITY_THRESHOLD}`,
        sql`${maxSimilarity(schema.translationKeys.description)} > ${SIMILARITY_THRESHOLD}`,
      )!,
    );

    // Sort by best match first (highest similarity across keyName/description).
    relevanceOrder = desc(sql`GREATEST(
      ${maxSimilarity(schema.translationKeys.keyName)},
      ${maxSimilarity(schema.translationKeys.description)}
    )`);
  }

  const data = await db
    .select()
    .from(schema.translationKeys)
    .where(and(...conditions))
    .orderBy(
      // Relevance first; keyName only breaks ties between equal scores.
      ...(relevanceOrder
        ? [relevanceOrder, schema.translationKeys.keyName]
        : [schema.translationKeys.keyName]),
    )
    .limit(limit)
    .offset(offset);

  const count = await db.$count(schema.translationKeys, and(...conditions));

  return { data, count };
}
