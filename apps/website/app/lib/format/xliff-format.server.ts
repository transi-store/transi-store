import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ExportRequestParams,
  ExportRequestResult,
  ProjectTranslations,
} from "./types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export class XliffTranslationFormat implements TranslationFormat {
  parseImport(fileContent: string): ParseResult {
    if (fileContent.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Le fichier est trop volumineux (maximum 5 MB)",
      };
    }

    try {
      const data: Record<string, string> = {};

      const unitRegex = /<unit\s[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/unit>/g;
      let unitMatch;

      while ((unitMatch = unitRegex.exec(fileContent)) !== null) {
        const keyName = unescapeXml(unitMatch[1]);
        const unitContent = unitMatch[2];

        const targetMatch = /<target>([\s\S]*?)<\/target>/.exec(unitContent);

        if (targetMatch) {
          data[keyName] = unescapeXml(targetMatch[1]);
        }
      }

      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error:
            "Aucune traduction cible trouvée dans le fichier XLIFF (pas de balises <target>)",
        };
      }

      return { success: true, data };
    } catch (_error) {
      return {
        success: false,
        error: "Format XLIFF invalide",
      };
    }
  }

  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string {
    const { locale, projectName } = options;
    const xml: Array<string> = [];

    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push(
      '<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="' +
        escapeXml(locale) +
        '">',
    );
    xml.push('  <file id="' + escapeXml(projectName!) + '">');

    for (const key of projectTranslations) {
      const translation = key.translations.find((t) => t.locale === locale);

      xml.push('    <unit id="' + escapeXml(key.keyName) + '">');

      if (key.description) {
        xml.push("      <notes>");
        xml.push("        <note>" + escapeXml(key.description) + "</note>");
        xml.push("      </notes>");
      }

      xml.push("      <segment>");
      xml.push("        <source>" + escapeXml(key.keyName) + "</source>");

      if (translation) {
        xml.push(
          "        <target>" + escapeXml(translation.value) + "</target>",
        );
      }

      xml.push("      </segment>");
      xml.push("    </unit>");
    }

    xml.push("  </file>");
    xml.push("</xliff>");

    return xml.join("\n");
  }

  handleExportRequest(params: ExportRequestParams): ExportRequestResult {
    const { searchParams, projectTranslations, projectName, availableLocales } =
      params;

    const locale = searchParams.get("locale");

    if (!locale) {
      return {
        success: false,
        error: "Missing 'locale' parameter. Use ?format=xliff&locale=fr",
      };
    }

    if (!availableLocales.includes(locale)) {
      return {
        success: false,
        error: `Language '${locale}' not found in this project`,
      };
    }

    const content = this.exportSingleLocale(projectTranslations, {
      locale,
      projectName,
    });

    return {
      success: true,
      content,
      fileExtension: "xliff",
      contentType: "application/x-xliff+xml",
    };
  }
}
