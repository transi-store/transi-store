import z from "zod";
import { ImportStrategy } from "./import-strategy.ts";
import { SUPPORTED_FORMATS_LIST, SupportedFormat } from "./supported-format.ts";

// Exposed as factories so consumers can run `extendZodWithOpenApi(z)` BEFORE
// the zod objects are created. See ./project-schema.ts for the same pattern.

export function createImportFieldsSchema() {
  return z.object({
    locale: z
      .string()
      .describe(
        "Language code to import into (must match one of the project's configured languages).",
      ),
    strategy: z
      .enum(ImportStrategy)
      .describe(
        "Import strategy. 'overwrite' updates existing translations. 'skip' only creates missing translations and leaves existing ones untouched.",
      ),
    format: z
      .enum(SupportedFormat)
      .optional()
      .describe(
        `File format (${SUPPORTED_FORMATS_LIST}). Auto-detected from file extension if omitted.`,
      ),
    branch: z
      .string()
      .optional()
      .describe(
        "Target branch slug. If the branch does not exist and has an open status, it will be created automatically. Omit to import into the main branch.",
      ),
  });
}

export function createImportStatsSchema() {
  return z.object({
    total: z
      .number()
      .describe("Total number of entries processed from the file."),
    keysCreated: z.number().describe("Number of new translation keys created."),
    translationsCreated: z
      .number()
      .describe("Number of new translations added."),
    translationsUpdated: z
      .number()
      .describe(
        "Number of existing translations updated (only with 'overwrite' strategy).",
      ),
    translationsSkipped: z
      .number()
      .describe(
        "Number of existing translations left untouched (only with 'skip' strategy).",
      ),
  });
}

export function createImportSuccessResponseSchema() {
  return z.object({
    success: z.literal(true),
    stats: createImportStatsSchema(),
  });
}

export function createImportErrorResponseSchema() {
  return z.object({
    error: z.string().describe("Human-readable error message."),
    details: z
      .string()
      .optional()
      .describe("Additional technical details about the error."),
  });
}

export type ImportFields = z.infer<ReturnType<typeof createImportFieldsSchema>>;
export type ImportStats = z.infer<ReturnType<typeof createImportStatsSchema>>;
export type ImportSuccessResponse = z.infer<
  ReturnType<typeof createImportSuccessResponseSchema>
>;
export type ImportErrorResponse = z.infer<
  ReturnType<typeof createImportErrorResponseSchema>
>;
