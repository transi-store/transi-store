import z from "zod";
import { ALL_BRANCHES_VALUE } from "./constants.ts";
import { SUPPORTED_FORMATS_LIST, SupportedFormat } from "./supported-format.ts";

// Exposed as factories so consumers can run `extendZodWithOpenApi(z)` BEFORE
// the zod objects are created. See ./project-schema.ts for the same pattern.

export function createExportQuerySchema() {
  return z.object({
    format: z
      .enum(SupportedFormat)
      .describe(`Output format. Supported formats: ${SUPPORTED_FORMATS_LIST}.`),
    locale: z
      .string()
      .describe(
        "Language code to export (must match one of the project's configured languages).",
      ),
    branch: z
      .string()
      .optional()
      .describe(
        `Branch slug. When set, translations from this branch are merged on top of main translations. Use "${ALL_BRANCHES_VALUE}" to export all translations across every branch (no branch filtering). Omit to export the main branch only.`,
      ),
  });
}

export function createExportErrorResponseSchema() {
  return z.object({
    error: z.string().describe("Human-readable error message."),
  });
}

export type ExportQuery = z.infer<ReturnType<typeof createExportQuerySchema>>;
export type ExportErrorResponse = z.infer<
  ReturnType<typeof createExportErrorResponseSchema>
>;
