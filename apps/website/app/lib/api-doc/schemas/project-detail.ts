import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  projectDetailSchema,
  projectFileSchema,
  projectLanguageSchema,
} from "@transi-store/common";

extendZodWithOpenApi(z);

// Register the shared zod schemas as named OpenAPI components. The shape and
// field descriptions come from @transi-store/common; this file only adds the
// OpenAPI-specific component names and examples.
projectFileSchema.openapi("ProjectFile", {
  example: { id: 42, format: "json", filePath: "locales/<lang>/common.json" },
});

projectLanguageSchema.openapi("ProjectLanguage", {
  example: { locale: "fr", isDefault: true },
});

export const projectDetailResponseSchema =
  projectDetailSchema.openapi("ProjectDetail");

export const projectDetailErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Human-readable error message.",
      example: "Project 'my-project' not found",
    }),
  })
  .openapi("ProjectDetailError");
