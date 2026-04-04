import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ExportRequestParams,
  ExportRequestResult,
  ProjectTranslations,
} from "./types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export class PhpTranslationFormat implements TranslationFormat {
  parseImport(fileContent: string): ParseResult {
    if (fileContent.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Le fichier est trop volumineux (maximum 5 MB)",
      };
    }

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
            "Aucune traduction trouvée dans le fichier PHP (format attendu : tableau associatif 'clé' => 'valeur')",
        };
      }

      return { success: true, data };
    } catch (_error) {
      return {
        success: false,
        error: "Format PHP invalide",
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
    const { searchParams, projectTranslations, availableLocales } = params;

    const locale = searchParams.get("locale");

    if (!locale) {
      return {
        success: false,
        error: "Missing 'locale' parameter. Use ?format=php&locale=fr",
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
