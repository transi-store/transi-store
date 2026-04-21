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

function toNmtoken(str: string): string {
  // xs:NMTOKEN allows only: letters, digits, '.', '-', '_', ':'
  const sanitized = str.replace(/[^a-zA-Z0-9.\-_:]/g, "_");
  return sanitized || "_";
}

function extractAttr(attrsStr: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(attrsStr);
  return match ? unescapeXml(match[1]) : null;
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

      const unitRegex = /<unit\s([^>]*?)>([\s\S]*?)<\/unit>/g;
      let unitMatch;

      while ((unitMatch = unitRegex.exec(fileContent)) !== null) {
        const attrsStr = unitMatch[1];
        const unitContent = unitMatch[2];
        const keyName =
          extractAttr(attrsStr, "name") ?? extractAttr(attrsStr, "id") ?? "";

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
    const { locale, fileId } = options;
    const xml: Array<string> = [];

    if (!fileId) {
      throw new Error("fileId is required for XLIFF export");
    }

    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push(
      '<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="' +
        escapeXml(locale) +
        '">',
    );
    xml.push(
      '  <file id="' +
        toNmtoken(fileId) +
        '" original="' +
        escapeXml(fileId) +
        '">',
    );

    const usedIds = new Set<string>();
    for (const key of projectTranslations) {
      const translation = key.translations.find((t) => t.locale === locale);

      const baseId = toNmtoken(key.keyName);
      let unitId = baseId;
      let counter = 1;
      while (usedIds.has(unitId)) {
        unitId = `${baseId}_${counter++}`;
      }
      usedIds.add(unitId);

      xml.push(
        '    <unit id="' + unitId + '" name="' + escapeXml(key.keyName) + '">',
      );

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
    const { locale, projectTranslations, fileId } = params;

    const content = this.exportSingleLocale(projectTranslations, {
      locale,
      fileId,
    });

    return {
      content,
      fileExtension: "xliff",
      contentType: "application/x-xliff+xml",
    };
  }
}
