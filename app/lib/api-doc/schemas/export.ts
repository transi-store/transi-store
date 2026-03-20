import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { SupportedFormat } from "~/lib/format/types";

extendZodWithOpenApi(z);

export const exportQuerySchema = (localeExample = "fr") =>
  z.object({
    format: z.enum(SupportedFormat).default(SupportedFormat.JSON).openapi({
      description:
        "Output format. JSON returns a flat key-value object. XLIFF returns an XLIFF 2.0 XML document.",
      example: SupportedFormat.JSON,
    }),
    locale: z.string().openapi({
      description:
        "Language code to export (must match one of the project's configured languages).",
      example: localeExample,
    }),
    branch: z.string().optional().openapi({
      description:
        "Branch slug. When set, translations from this branch are merged on top of main translations. Omit to export the main branch only.",
      example: "feature-xyz",
    }),
  });

export const exportErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Human-readable error message.",
      example: "Invalid format. Use 'json' or 'xliff'",
    }),
  })
  .openapi("ExportError");
