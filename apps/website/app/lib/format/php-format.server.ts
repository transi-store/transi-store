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
      const data: Record<string, string> = {};

      // Match key => value pairs in PHP array syntax
      // Supports both 'key' => 'value' and "key" => "value"
      const entryRegex =
        /(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*=>\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;

      let match;
      while ((match = entryRegex.exec(fileContent)) !== null) {
        const key = unescapePhpString(match[1] ?? match[2]);
        const value = unescapePhpString(match[3] ?? match[4]);
        data[key] = value;
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

function unescapePhpString(str: string): string {
  return str.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
}
