import ini from "ini";
import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ExportRequestParams,
  ExportRequestResult,
  ProjectTranslations,
} from "./types";

export class IniTranslationFormat implements TranslationFormat {
  parseImport(fileContent: string): ParseResult {
    try {
      const parsed = ini.parse(fileContent);

      const data: Record<string, string> = {};

      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") {
          data[key] = value;
        }
      }

      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error:
            "No translations found in the INI file (expected format: key=value)",
        };
      }

      return { success: true, data };
    } catch (_error) {
      return {
        success: false,
        error: "Invalid INI format",
      };
    }
  }

  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string {
    const data: Record<string, string> = {};

    for (const key of projectTranslations) {
      const translation = key.translations.find(
        (t) => t.locale === options.locale,
      );

      if (translation) {
        data[key.keyName] = translation.value;
      }
    }

    // ini.stringify adds a trailing newline; trim it for consistency
    return ini.stringify(data).trimEnd();
  }

  handleExportRequest(params: ExportRequestParams): ExportRequestResult {
    const { locale, projectTranslations } = params;

    const content = this.exportSingleLocale(projectTranslations, { locale });

    return {
      content,
      fileExtension: "ini",
      contentType: "text/plain",
    };
  }
}
