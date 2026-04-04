import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ExportRequestParams,
  ExportRequestResult,
  ProjectTranslations,
} from "./types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export class IniTranslationFormat implements TranslationFormat {
  parseImport(fileContent: string): ParseResult {
    if (fileContent.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Le fichier est trop volumineux (maximum 5 MB)",
      };
    }

    try {
      const data: Record<string, string> = {};
      const lines = fileContent.split(/\r?\n/);

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (
          trimmed === "" ||
          trimmed.startsWith(";") ||
          trimmed.startsWith("#")
        ) {
          continue;
        }

        // Skip section headers
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          continue;
        }

        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;

        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();

        // Remove surrounding quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        if (key) {
          data[key] = value;
        }
      }

      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error:
            "Aucune traduction trouvée dans le fichier INI (format attendu : clé=valeur)",
        };
      }

      return { success: true, data };
    } catch (_error) {
      return {
        success: false,
        error: "Format INI invalide",
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
        const value = translation.value;
        // Quote value if it contains special characters
        if (needsQuoting(value)) {
          lines.push(key.keyName + "=" + '"' + escapeIniValue(value) + '"');
        } else {
          lines.push(key.keyName + "=" + value);
        }
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
        error: "Missing 'locale' parameter. Use ?format=ini&locale=fr",
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
      fileExtension: "ini",
      contentType: "text/plain",
    };
  }
}

function needsQuoting(value: string): boolean {
  return (
    value.includes('"') ||
    value.includes("=") ||
    value.includes(";") ||
    value.includes("#") ||
    value.includes("\n") ||
    value.startsWith(" ") ||
    value.endsWith(" ")
  );
}

function escapeIniValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
