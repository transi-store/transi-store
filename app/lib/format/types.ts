import type { ProjectTranslations } from "~/lib/translation-keys.server";

export type { ProjectTranslations };

export type ParseResult = {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
};

export type ExportOptions = {
  /** For JSON: the locale to export. For XLIFF: the target locale. */
  locale: string;
  /** XLIFF only: the source locale */
  sourceLocale?: string;
  /** XLIFF only: project name used as XLIFF file id */
  projectName?: string;
};

export interface TranslationFormat {
  /**
   * Parse file content into flat key-value pairs.
   */
  parseImport(fileContent: string): ParseResult;

  /**
   * Export project translations for a single locale.
   * For XLIFF, `sourceLocale` and `projectName` must be provided in options.
   */
  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string;
}
