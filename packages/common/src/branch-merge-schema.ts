import z from "zod";

// Exposed as factories so consumers can run `extendZodWithOpenApi(z)` BEFORE
// the zod objects are created. See ./project-schema.ts for the same pattern.

export function createBranchMergeQuerySchema() {
  return z.object({
    into: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Slug of the branch to merge into. Omit to merge into main. A missing branch is created, and a merged branch is followed down to the branch it was merged into.",
      ),
  });
}

export function createBranchMergeSuccessResponseSchema() {
  return z.object({
    success: z.literal(true),
    keysMoved: z
      .number()
      .int()
      .describe("Number of branch keys moved to the target."),
    keysDeleted: z
      .number()
      .int()
      .describe(
        "Number of pending key deletions applied on main, or carried over to the target branch.",
      ),
    into: z
      .string()
      .nullable()
      .describe(
        "Slug of the branch the merge landed on, or null when it landed on main.",
      ),
  });
}

export function createBranchMergeErrorResponseSchema() {
  return z.object({
    error: z.string().describe("Human-readable error message."),
  });
}
