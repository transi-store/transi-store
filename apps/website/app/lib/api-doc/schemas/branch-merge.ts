import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  createBranchMergeErrorResponseSchema,
  createBranchMergeQuerySchema,
  createBranchMergeSuccessResponseSchema,
} from "@transi-store/common";

// `.openapi()` is added to ZodType.prototype here, and schemas are instantiated
// AFTER the patch so the method is available on them.
extendZodWithOpenApi(z);

export const branchMergeQuerySchema = createBranchMergeQuerySchema().extend({
  into: z
    .string()
    .min(1)
    .optional()
    .openapi({
      description:
        "Slug of the branch to merge into. Omit to merge into main. " +
        "A missing branch is created. " +
        "A branch that is already merged is followed down to the branch it was merged into, or to main.",
      example: "feature-parent",
    }),
});

export const branchMergeSuccessResponseSchema =
  createBranchMergeSuccessResponseSchema()
    .extend({
      keysMoved: z.number().int().openapi({
        description: "Number of branch keys moved to the target.",
        example: 5,
      }),
      keysDeleted: z.number().int().openapi({
        description:
          "Number of pending key deletions applied on main (soft-deleted keys), or carried over to the target branch.",
        example: 1,
      }),
      into: z.string().nullable().openapi({
        description:
          "Slug of the branch the merge landed on, or null when it landed on main.",
        example: "feature-parent",
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
