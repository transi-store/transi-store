import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ExportRequestParams,
  ExportRequestResult,
  ProjectTranslations,
} from "./types";

export class CsvTranslationFormat implements TranslationFormat {
  parseImport(fileContent: string): ParseResult {
    try {
      const records: Array<Array<string>> = parse(fileContent, {
        relax_column_count: true,
        skip_empty_lines: true,
      });

      const data: Record<string, string> = {};

      for (const record of records) {
        if (record.length < 2) continue;

        const key = record[0];
        const value = record[1];

        if (key) {
          data[key] = value;
        }
      }

      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error:
            "No translations found in the CSV file (expected format: key,value)",
        };
      }

      return { success: true, data };
    } catch (_error) {
      return {
        success: false,
        error: "Invalid CSV format",
      };
    }
  }

  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string {
    const records: Array<Array<string>> = [];

    for (const key of projectTranslations) {
      const translation = key.translations.find(
        (t) => t.locale === options.locale,
      );

      if (translation) {
        records.push([key.keyName, translation.value]);
      }
    }

    // csv-stringify always adds a trailing newline; trim it for consistency
    return stringify(records).trimEnd();
  }

  handleExportRequest(params: ExportRequestParams): ExportRequestResult {
    const { locale, projectTranslations } = params;

    const content = this.exportSingleLocale(projectTranslations, { locale });

    return {
      content,
      fileExtension: "csv",
      contentType: "text/csv",
    };
  }
}
