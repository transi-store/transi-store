import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";
import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ExportRequestParams,
  ExportRequestResult,
  ProjectTranslations,
} from "./types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
  isArray: (name) => name === "file" || name === "unit" || name === "note",
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  indentBy: "  ",
  suppressEmptyNode: false,
  processEntities: true,
});

type XliffUnit = {
  "@_id"?: string;
  "@_name"?: string;
  notes?: { note?: Array<string | { "#text"?: string }> };
  segment?: {
    source?: string | { "#text"?: string };
    target?: string | { "#text"?: string };
  };
};

type XliffFile = {
  "@_id"?: string;
  "@_original"?: string;
  unit?: Array<XliffUnit>;
};

type XliffDoc = {
  xliff?: {
    file?: Array<XliffFile>;
  };
};

function textOf(node: string | { "#text"?: string } | undefined): string {
  if (node === undefined) {
    return "";
  }
  if (typeof node === "string") {
    return node;
  }
  return node["#text"] ?? "";
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

    let parsed: XliffDoc;
    try {
      parsed = parser.parse(fileContent) as XliffDoc;
    } catch (_error) {
      return {
        success: false,
        error: "Format XLIFF invalide",
      };
    }

    const files = parsed.xliff?.file ?? [];
    const data: Record<string, string> = {};

    for (const file of files) {
      for (const unit of file.unit ?? []) {
        let keyName = unit["@_name"];

        // if no "name" attribute, take the <source> content
        // Mainly because Symfony does not add "name" for sources longer than 80 characters
        // https://github.com/symfony/symfony/pull/26661
        if (!keyName) {
          const source = textOf(unit.segment?.source);
          if (source) {
            keyName = source;
          }
        }

        if (!keyName) {
          return {
            success: false,
            error:
              'No key name found for a <unit> (missing "name" attribute and <source> tag)',
          };
        }

        const target = unit.segment?.target;
        if (target !== undefined) {
          data[keyName] = textOf(target);
        }
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
  }

  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string {
    const { locale, fileId, filePath } = options;

    if (fileId === undefined) {
      throw new Error("fileId is required for XLIFF export");
    }

    if (filePath === undefined) {
      throw new Error("filePath is required for XLIFF export");
    }

    const xliff: Record<string, unknown> = {
      "@_xmlns": "urn:oasis:names:tc:xliff:document:2.0",
      "@_version": "2.0",
      "@_srcLang": "en",
      "@_trgLang": locale,
    };

    if (projectTranslations.length > 0) {
      const units: Array<XliffUnit> = projectTranslations
        .map((key): XliffUnit | null => {
          const translation = key.translations.find((t) => t.locale === locale);

          if (!translation) {
            return null; // skip keys without translation in the target locale
          }

          const unit: XliffUnit = {
            "@_id": String(key.id),
            "@_name": key.keyName,
          };

          if (key.description) {
            unit.notes = { note: [key.description] };
          }

          const segment: { source: string; target?: string } = {
            source: key.keyName,
          };
          if (translation) {
            segment.target = translation.value;
          }
          unit.segment = segment;

          return unit;
        })
        .filter((unit): unit is XliffUnit => unit !== null);

      xliff.file = [
        {
          "@_id": String(fileId),
          "@_original": resolveFilePath(filePath, locale),
          unit: units,
        },
      ];
    }

    const doc = {
      "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
      xliff,
    };

    return builder.build(doc).trimEnd();
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
