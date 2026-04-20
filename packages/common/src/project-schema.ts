import z from "zod";
import { SupportedFormat } from "./supported-format.ts";

export const projectFileSchema = z.object({
  id: z.number().describe("Project file identifier."),
  format: z.enum(SupportedFormat).describe("File format."),
  filePath: z
    .string()
    .describe(
      "Relative path to the translation file, with a `<lang>` placeholder that is replaced by each locale when writing the file to disk.",
    ),
});

export type ProjectFile = z.infer<typeof projectFileSchema>;

export const projectLanguageSchema = z.object({
  locale: z.string().describe("BCP-47 language tag."),
  isDefault: z
    .boolean()
    .describe("Whether this language is the project's default locale."),
});

export type ProjectLanguage = z.infer<typeof projectLanguageSchema>;

export const projectDetailSchema = z.object({
  files: z.array(projectFileSchema),
  languages: z.array(projectLanguageSchema),
});

export type ProjectDetail = z.infer<typeof projectDetailSchema>;
