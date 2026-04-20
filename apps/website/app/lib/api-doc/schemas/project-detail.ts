import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { SupportedFormat, SUPPORTED_FORMATS_LIST } from "@transi-store/common";

extendZodWithOpenApi(z);

const projectFileSchema = z
  .object({
    id: z.number().openapi({
      description: "Project file identifier.",
      example: 42,
    }),
    format: z.enum(SupportedFormat).openapi({
      description: `File format. Supported formats: ${SUPPORTED_FORMATS_LIST}.`,
      example: SupportedFormat.JSON,
    }),
    filePath: z.string().openapi({
      description:
        "Relative path to the translation file, with a `<lang>` placeholder that is replaced by each locale when writing the file to disk.",
      example: "locales/<lang>/common.json",
    }),
  })
  .openapi("ProjectFile");

const projectLanguageSchema = z
  .object({
    locale: z.string().openapi({
      description: "BCP-47 language tag.",
      example: "fr",
    }),
    isDefault: z.boolean().openapi({
      description: "Whether this language is the project's default locale.",
      example: true,
    }),
  })
  .openapi("ProjectLanguage");

export const projectDetailResponseSchema = z
  .object({
    files: z.array(projectFileSchema),
    languages: z.array(projectLanguageSchema),
  })
  .openapi("ProjectDetail");

export const projectDetailErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Human-readable error message.",
      example: "Project 'my-project' not found",
    }),
  })
  .openapi("ProjectDetailError");
