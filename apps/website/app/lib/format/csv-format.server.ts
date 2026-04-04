import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ExportRequestParams,
  ExportRequestResult,
  ProjectTranslations,
} from "./types";

function escapeCsvValue(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function parseCsvLine(line: string): Array<string> {
  const fields: Array<string> = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        fields.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  fields.push(current);

  return fields;
}

export class CsvTranslationFormat implements TranslationFormat {
  parseImport(fileContent: string): ParseResult {
    try {
      const data: Record<string, string> = {};
      const lines = fileContent.split(/\r?\n/);

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "") continue;

        const fields = parseCsvLine(trimmed);

        if (fields.length < 2) continue;

        const key = fields[0];
        const value = fields[1];

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
    const lines: Array<string> = [];

    for (const key of projectTranslations) {
      const translation = key.translations.find(
        (t) => t.locale === options.locale,
      );

      if (translation) {
        lines.push(
          escapeCsvValue(key.keyName) + "," + escapeCsvValue(translation.value),
        );
      }
    }

    return lines.join("\n");
  }

  handleExportRequest(params: ExportRequestParams): ExportRequestResult {
    const { searchParams, projectTranslations, availableLocales } = params;

    const locale = searchParams.get("locale");

    if (!locale) {
      return {
        success: false,
        error: "Missing 'locale' parameter. Use ?format=csv&locale=fr",
      };
    }

    if (!availableLocales.includes(locale)) {
      return {
        success: false,
        error: `Language '${locale}' not found in this project`,
      };
    }

    const content = this.exportSingleLocale(projectTranslations, { locale });

    return {
      success: true,
      content,
      fileExtension: "csv",
      contentType: "text/csv",
    };
  }
}
