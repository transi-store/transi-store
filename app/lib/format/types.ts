import type { ProjectTranslations } from "~/lib/translation-keys.server";

export type { ProjectTranslations };

export type ParseResult = {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
};

export type ExportOptions = {
  /** The locale to export */
  locale: string;
  /** XLIFF only: project name used as XLIFF file id */
  projectName?: string;
};

export type ExportRequestParams = {
  searchParams: URLSearchParams;
  projectTranslations: ProjectTranslations;
  projectName: string;
  availableLocales: Array<string>;
};

export type ExportRequestResult =
  | {
      success: true;
      content: string;
      fileExtension: string;
      contentType: string;
    }
  | { success: false; error: string };

export interface TranslationFormat {
  /**
   * Parse file content into flat key-value pairs.
   */
  parseImport(fileContent: string): ParseResult;

  /**
   * Export project translations for a single locale.
   */
  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string;

  /**
   * Handle a full export request: validate URL params, export content,
   * and build the response filename and content-type.
   */
  handleExportRequest(params: ExportRequestParams): ExportRequestResult;
}
