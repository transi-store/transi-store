import { db, schema } from "./db.server";
import { eq } from "drizzle-orm";

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
  createdBy: number;
};

export async function createBranch(params: CreateBranchParams) {
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

export async function deleteBranch(branchId: number) {
  // CASCADE will delete associated translation_keys and their translations
  await db.delete(schema.branches).where(eq(schema.branches.id, branchId));
}

export async function getBranchKeys(branchId: number) {
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
  | { success: true; keysMoved: number }
  | { success: false; error: string; conflictingKeys?: string[] };

export async function mergeBranch(
  branchId: number,
  mergedBy: number,
): Promise<MergeBranchResult> {
  const branch = await getBranchById(branchId);
  if (!branch) {
    return { success: false, error: "Branch not found" };
  }

  if (branch.status !== "open") {
    return { success: false, error: "Branch is not open" };
  }

  // Get the keys on this branch
  const branchKeys = await db.query.translationKeys.findMany({
    where: { branchId },
  });

  if (branchKeys.length === 0) {
    // No keys to merge, just mark as merged
    await db
      .update(schema.branches)
      .set({ status: "merged", mergedBy, mergedAt: new Date() })
      .where(eq(schema.branches.id, branchId));

    return { success: true, keysMoved: 0 };
  }

  // Move keys from branch to main (set branchId = NULL)
  // The unique constraint (project_id, key_name) ensures no collision
  try {
    let keysMoved = 0;

    await db.transaction(async (tx) => {
      const [result] = await tx
        .update(schema.translationKeys)
        .set({ branchId: null })
        .where(eq(schema.translationKeys.branchId, branchId))
        .returning({ id: schema.translationKeys.id });

      keysMoved = result ? branchKeys.length : 0;

      await tx
        .update(schema.branches)
        .set({ status: "merged", mergedBy, mergedAt: new Date() })
        .where(eq(schema.branches.id, branchId));
    });

    return { success: true, keysMoved };
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
