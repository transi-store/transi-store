import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const branchMergeSuccessResponseSchema = z
  .object({
    success: z.literal(true),
    keysMoved: z.number().int().openapi({
      description: "Number of branch keys moved to the main branch.",
      example: 5,
    }),
    keysDeleted: z.number().int().openapi({
      description: "Number of main keys soft-deleted by the merge.",
      example: 1,
    }),
  })
  .openapi("BranchMergeSuccess");

export const branchMergeErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Human-readable error message.",
      example: 'Branch "feature-xyz" not found',
    }),
  })
  .openapi("BranchMergeError");
