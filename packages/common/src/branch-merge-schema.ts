import z from "zod";

// Exposed as factories so consumers can run `extendZodWithOpenApi(z)` BEFORE
// the zod objects are created. See ./project-schema.ts for the same pattern.

export function createBranchMergeSuccessResponseSchema() {
  return z.object({
    success: z.literal(true),
    keysMoved: z
      .number()
      .int()
      .describe("Number of branch keys moved to the main branch."),
    keysDeleted: z
      .number()
      .int()
      .describe("Number of main keys soft-deleted by the merge."),
  });
}

export function createBranchMergeErrorResponseSchema() {
  return z.object({
    success: z.literal(false),
    error: z.string().describe("Human-readable error message."),
  });
}

export type BranchMergeSuccessResponse = z.infer<
  ReturnType<typeof createBranchMergeSuccessResponseSchema>
>;
export type BranchMergeErrorResponse = z.infer<
  ReturnType<typeof createBranchMergeErrorResponseSchema>
>;
