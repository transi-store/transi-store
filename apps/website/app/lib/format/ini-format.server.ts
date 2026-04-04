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
    const { locale, projectTranslations } = params;

    const content = this.exportSingleLocale(projectTranslations, { locale });

    return {
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
