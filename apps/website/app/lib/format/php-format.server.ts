import { fromString } from "php-array-reader";
import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ExportRequestParams,
  ExportRequestResult,
  ProjectTranslations,
} from "./types";

export class PhpTranslationFormat implements TranslationFormat {
  parseImport(fileContent: string): ParseResult {
    try {
      const parsed = fromString(fileContent);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return {
          success: false,
          error:
            "No translations found in the PHP file (expected format: 'key' => 'value' array)",
        };
      }

      const data: Record<string, string> = {};
      for (const [key, value] of Object.entries(
        parsed as Record<string, unknown>,
      )) {
        if (typeof value === "string") {
          data[key] = value;
        } else if (value !== null && value !== undefined) {
          data[key] = String(value);
        }
      }

      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error:
            "No translations found in the PHP file (expected format: 'key' => 'value' array)",
        };
      }

      return { success: true, data };
    } catch (_error) {
      return {
        success: false,
        error: "Invalid PHP format",
      };
    }
  }

  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string {
    const lines: Array<string> = [];

    lines.push("<?php");
    lines.push("");
    lines.push("return [");

    for (const key of projectTranslations) {
      const translation = key.translations.find(
        (t) => t.locale === options.locale,
      );

      if (translation) {
        lines.push(
          "    " +
            quotePhpString(key.keyName) +
            " => " +
            quotePhpString(translation.value) +
            ",",
        );
      }
    }

    lines.push("];");

    return lines.join("\n");
  }

  handleExportRequest(params: ExportRequestParams): ExportRequestResult {
    const { locale, projectTranslations } = params;

    const content = this.exportSingleLocale(projectTranslations, { locale });

    return {
      content,
      fileExtension: "php",
      contentType: "text/x-php",
    };
  }
}

function escapePhpString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function quotePhpString(str: string): string {
  return "'" + escapePhpString(str) + "'";
}
