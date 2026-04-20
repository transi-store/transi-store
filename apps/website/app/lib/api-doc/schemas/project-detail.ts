import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  createProjectDetailSchema,
  createProjectFileSchema,
  createProjectLanguageSchema,
} from "@transi-store/common";

// `.openapi()` is added to ZodType.prototype here, and schemas are instantiated
// AFTER the patch so the method is available on them.
extendZodWithOpenApi(z);

createProjectFileSchema().openapi("ProjectFile", {
  example: { id: 42, format: "json", filePath: "locales/<lang>/common.json" },
});

createProjectLanguageSchema().openapi("ProjectLanguage", {
  example: { locale: "fr", isDefault: true },
});

export const projectDetailResponseSchema =
  createProjectDetailSchema().openapi("ProjectDetail");

export const projectDetailErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Human-readable error message.",
      example: "Project 'my-project' not found",
    }),
  })
  .openapi("ProjectDetailError");
