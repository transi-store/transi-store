import YAML from "yaml";
import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ExportRequestParams,
  ExportRequestResult,
  ProjectTranslations,
} from "./types";

export class YamlTranslationFormat implements TranslationFormat {
  parseImport(fileContent: string): ParseResult {
    try {
      const parsed = YAML.parse(fileContent);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return {
          success: false,
          error: "File must contain a YAML object with key/value pairs",
        };
      }

      // Flatten nested YAML structure into dot-separated keys
      const data = flattenObject(parsed);

      return {
        success: true,
        data,
      };
    } catch (_error) {
      return {
        success: false,
        error: "Invalid YAML format",
      };
    }
  }

  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string {
    const result: Record<string, string> = {};

    for (const key of projectTranslations) {
      const translation = key.translations.find(
        (t) => t.locale === options.locale,
      );

      if (translation) {
        result[key.keyName] = translation.value;
      }
    }

    return YAML.stringify(result, { lineWidth: 0 }).trimEnd();
  }

  handleExportRequest(params: ExportRequestParams): ExportRequestResult {
    const { locale, projectTranslations } = params;

    const content = this.exportSingleLocale(projectTranslations, { locale });

    return {
      content,
      fileExtension: "yaml",
      contentType: "text/yaml",
    };
  }
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, fullKey),
      );
    } else if (typeof value === "string") {
      result[fullKey] = value;
    } else if (value !== null && value !== undefined) {
      result[fullKey] = String(value);
    }
  }

  return result;
}
