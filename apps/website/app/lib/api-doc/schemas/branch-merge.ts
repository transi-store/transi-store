import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  createBranchMergeErrorResponseSchema,
  createBranchMergeSuccessResponseSchema,
} from "@transi-store/common";

// `.openapi()` is added to ZodType.prototype here, and schemas are instantiated
// AFTER the patch so the method is available on them.
extendZodWithOpenApi(z);

export const branchMergeSuccessResponseSchema =
  createBranchMergeSuccessResponseSchema()
    .extend({
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

export const branchMergeErrorResponseSchema =
  createBranchMergeErrorResponseSchema()
    .extend({
      error: z.string().openapi({
        description: "Human-readable error message.",
        example: 'Branch "feature-xyz" not found',
      }),
    })
    .openapi("BranchMergeError");
