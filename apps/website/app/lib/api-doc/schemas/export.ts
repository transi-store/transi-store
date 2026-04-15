import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  ALL_BRANCHES_VALUE,
  SupportedFormat,
  SUPPORTED_FORMATS_LIST,
} from "@transi-store/common";

extendZodWithOpenApi(z);

export const exportQuerySchema = (localeExample = "fr") =>
  z.object({
    format: z.enum(SupportedFormat).openapi({
      description: `Output format. Supported formats: ${SUPPORTED_FORMATS_LIST}.`,
      example: SupportedFormat.JSON,
    }),
    locale: z.string().openapi({
      description:
        "Language code to export (must match one of the project's configured languages).",
      example: localeExample,
    }),
    branch: z
      .string()
      .optional()
      .openapi({
        description: `Branch slug. When set, translations from this branch are merged on top of main translations. Use "${ALL_BRANCHES_VALUE}" to export all translations across every branch (no branch filtering). Omit to export the main branch only.`,
        example: "feature-xyz",
      }),
  });

export const exportErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Human-readable error message.",
      example: `Invalid format. Use ${SUPPORTED_FORMATS_LIST}`,
    }),
  })
  .openapi("ExportError");
