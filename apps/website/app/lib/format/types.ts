import type { ProjectTranslations } from "~/lib/translation-keys.server";
import { SupportedFormat } from "@transi-store/common";

export type { ProjectTranslations };
export { SupportedFormat };

export type ParseResult = {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
};

export type ExportOptions = {
  /** The locale to export */
  locale: string;
  /** XLIFF only: file name used as XLIFF file id */
  fileId?: string;
};

export type ExportRequestParams = {
  locale: string;
  projectTranslations: ProjectTranslations;
  fileId: string;
};

export type ExportRequestResult = {
  content: string;
  fileExtension: string;
  contentType: string;
};

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
   * Handle a full export request: export content and return
   * the content string, filename extension, and content-type.
   *
   * Locale and format validation is done by the caller (route handler).
   */
  handleExportRequest(params: ExportRequestParams): ExportRequestResult;
}
