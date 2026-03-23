import type { Branch, TranslationKey } from "../../drizzle/schema";
import { BRANCH_STATUS } from "./branches";
import { db, schema } from "./db.server";
import { and, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";

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

export async function getBranchKeys(
  branchId: number,
): Promise<Array<TranslationKey>> {
  return await db.query.translationKeys.findMany({
    where: { branchId },
    orderBy: { keyName: "asc" },
  });
}

export async function getBranchKeyCount(branchId: number): Promise<number> {
  return await db.$count(
    schema.translationKeys,
    eq(schema.translationKeys.branchId, branchId),
  );
}

type MergeBranchResult =
  | { success: true; keysMoved: number; keysDeleted: number }
  | { success: false; error: string; conflictingKeys?: string[] };

export async function mergeBranch(
  branchId: number,
  mergedBy: number,
): Promise<MergeBranchResult> {
  const branch = await getBranchById(branchId);
  if (!branch) {
    return { success: false, error: "Branch not found" };
  }

  if (branch.status !== BRANCH_STATUS.OPEN) {
    return { success: false, error: "Branch is not open" };
  }

  // Get the keys on this branch
  const branchKeys = await db.query.translationKeys.findMany({
    where: { branchId },
  });

  // Get the key deletions for this branch
  const keyDeletions = await db.query.branchKeyDeletions.findMany({
    where: { branchId },
  });

  // Move keys from branch to main (set branchId = NULL)
  // The unique constraint (project_id, key_name) ensures no collision
  try {
    let keysMoved = 0;
    let keysDeleted = 0;

    await db.transaction(async (tx) => {
      if (branchKeys.length > 0) {
        const [result] = await tx
          .update(schema.translationKeys)
          .set({ branchId: null })
          .where(eq(schema.translationKeys.branchId, branchId))
          .returning({ id: schema.translationKeys.id });

        keysMoved = result ? branchKeys.length : 0;
      }

      // Soft-delete keys marked for deletion
      if (keyDeletions.length > 0) {
        const deletionKeyIds = keyDeletions.map((d) => d.translationKeyId);
        await tx
          .update(schema.translationKeys)
          .set({ deletedAt: new Date() })
          .where(inArray(schema.translationKeys.id, deletionKeyIds));

        keysDeleted = deletionKeyIds.length;

        // Clean up the branch_key_deletions entries
        await tx
          .delete(schema.branchKeyDeletions)
          .where(eq(schema.branchKeyDeletions.branchId, branchId));
      }

      await tx
        .update(schema.branches)
        .set({ status: BRANCH_STATUS.MERGED, mergedBy, mergedAt: new Date() })
        .where(eq(schema.branches.id, branchId));
    });

    return { success: true, keysMoved, keysDeleted };
  } catch (error) {
    // Unique constraint violation = conflict
    if (
      error instanceof Error &&
      error.message.includes("unique_project_key")
    ) {
      return {
        success: false,
        error: "Conflicting keys exist on main",
        conflictingKeys: branchKeys.map((k) => k.keyName),
      };
    }
    throw error;
  }
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
): Promise<Array<TranslationKey>> {
  const deletions = await db
    .select({ translationKeyId: schema.branchKeyDeletions.translationKeyId })
    .from(schema.branchKeyDeletions)
    .where(eq(schema.branchKeyDeletions.branchId, branchId));

  if (deletions.length === 0) return [];

  return db.query.translationKeys.findMany({
    where: {
      id: { in: deletions.map((d) => d.translationKeyId) },
    },
    orderBy: { keyName: "asc" },
  });
}

export async function getBranchKeyDeletionCount(
  branchId: number,
): Promise<number> {
  return await db.$count(
    schema.branchKeyDeletions,
    eq(schema.branchKeyDeletions.branchId, branchId),
  );
}

/**
 * Search main keys that can be marked for deletion in a branch.
 * Excludes keys already marked for deletion in this branch.
 */
export async function searchMainKeysForDeletion(
  projectId: number,
  branchId: number,
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
    isNull(schema.translationKeys.branchId),
    isNull(schema.translationKeys.deletedAt),
  ];

  if (alreadyMarkedIds.length > 0) {
    conditions.push(notInArray(schema.translationKeys.id, alreadyMarkedIds));
  }

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
  }

  const data = await db
    .select()
    .from(schema.translationKeys)
    .where(and(...conditions))
    .orderBy(schema.translationKeys.keyName)
    .limit(limit)
    .offset(offset);

  const count = await db.$count(schema.translationKeys, and(...conditions));

  return { data, count };
}
