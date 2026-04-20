import z from "zod";
import { SupportedFormat } from "./supported-format.ts";

// The schemas below are exposed as factories rather than pre-built instances so
// that consumers can run `extendZodWithOpenApi(z)` BEFORE the zod objects are
// created. When `extendZodWithOpenApi` runs after a schema already exists, the
// instance's prototype chain is frozen and `.openapi()` is not picked up.

export function createProjectFileSchema() {
  return z.object({
    id: z.number().describe("Project file identifier."),
    format: z.enum(SupportedFormat).describe("File format."),
    filePath: z
      .string()
      .describe(
        "Relative path to the translation file, with a `<lang>` placeholder that is replaced by each locale when writing the file to disk.",
      ),
  });
}

export function createProjectLanguageSchema() {
  return z.object({
    locale: z.string().describe("BCP-47 language tag."),
    isDefault: z
      .boolean()
      .describe("Whether this language is the project's default locale."),
  });
}

export function createProjectDetailSchema() {
  return z.object({
    files: z.array(createProjectFileSchema()),
    languages: z.array(createProjectLanguageSchema()),
  });
}

export type ProjectFile = z.infer<ReturnType<typeof createProjectFileSchema>>;
export type ProjectLanguage = z.infer<
  ReturnType<typeof createProjectLanguageSchema>
>;
export type ProjectDetail = z.infer<
  ReturnType<typeof createProjectDetailSchema>
>;
