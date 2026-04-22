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

function extractAttr(attrsStr: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(attrsStr);
  return match ? unescapeXml(match[1]) : null;
}

function resolveFilePath(filePath: string, locale: string): string {
  return filePath.replace("<lang>", locale);
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

        let keyName = extractAttr(attrsStr, "name");

        // if not key "name", take the "<source>" content
        // Mainly because Symfony does not add "name" for sources that are more that 80 characters long
        // https://github.com/symfony/symfony/pull/26661
        if (!keyName) {
          const sourceMatch = /<source>([\s\S]*?)<\/source>/.exec(unitContent);
          if (sourceMatch) {
            keyName = unescapeXml(sourceMatch[1]);
          }
        }

        if (!keyName) {
          return {
            success: false,
            error:
              'No key name found for a <unit> (missing "name" attribute and <source> tag)',
          };
        }

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
    const { locale, fileId, filePath } = options;
    const xml: Array<string> = [];

    if (fileId === undefined) {
      throw new Error("fileId is required for XLIFF export");
    }

    if (filePath === undefined) {
      throw new Error("filePath is required for XLIFF export");
    }

    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push(
      '<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="' +
        escapeXml(locale) +
        '">',
    );

    if (projectTranslations.length > 0) {
      xml.push(
        '  <file id="' +
          fileId +
          '" original="' +
          escapeXml(resolveFilePath(filePath, locale)) +
          '">',
      );

      for (const key of projectTranslations) {
        const translation = key.translations.find((t) => t.locale === locale);

        xml.push(
          '    <unit id="' +
            key.id +
            '" name="' +
            escapeXml(key.keyName) +
            '">',
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
    }

    xml.push("</xliff>");

    return xml.join("\n");
  }

  handleExportRequest(params: ExportRequestParams): ExportRequestResult {
    const { locale, projectTranslations, fileId, filePath } = params;

    const content = this.exportSingleLocale(projectTranslations, {
      locale,
      fileId,
      filePath,
    });

    return {
      content,
      fileExtension: "xliff",
      contentType: "application/x-xliff+xml",
    };
  }
}
