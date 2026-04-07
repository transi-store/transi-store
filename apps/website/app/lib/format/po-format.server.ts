import { po as gettextPo } from "gettext-parser";
import type { GetTextTranslation } from "gettext-parser";
import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ExportRequestParams,
  ExportRequestResult,
  ProjectTranslations,
} from "./types";

export class PoTranslationFormat implements TranslationFormat {
  parseImport(fileContent: string): ParseResult {
    try {
      const parsed = gettextPo.parse(fileContent);
      const data: Record<string, string> = {};

      const context = parsed.translations[""] ?? {};

      for (const [msgid, entry] of Object.entries(context)) {
        // Skip the header entry (empty msgid)
        if (!msgid) continue;

        const translation = entry as GetTextTranslation;
        const msgstr = translation.msgstr[0];
        if (msgstr) {
          data[msgid] = msgstr;
        }
      }

      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error:
            "No translations found in the PO file (no msgid/msgstr entries)",
        };
      }

      return { success: true, data };
    } catch (_error) {
      return {
        success: false,
        error: "Invalid PO format",
      };
    }
  }

  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string {
    const translations: Record<
      string,
      { msgid: string; msgstr: Array<string> }
    > = {
      "": {
        msgid: "",
        msgstr: [
          `Content-Type: text/plain; charset=UTF-8\nContent-Transfer-Encoding: 8bit\nLanguage: ${options.locale}\n`,
        ],
      },
    };

    for (const key of projectTranslations) {
      const translation = key.translations.find(
        (t) => t.locale === options.locale,
      );

      if (translation) {
        translations[key.keyName] = {
          msgid: key.keyName,
          msgstr: [translation.value],
        };
      }
    }

    const data = {
      charset: "utf-8" as const,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Content-Transfer-Encoding": "8bit",
        Language: options.locale,
      },
      translations: { "": translations },
    };

    return gettextPo.compile(data).toString().trimEnd();
  }

  handleExportRequest(params: ExportRequestParams): ExportRequestResult {
    const { locale, projectTranslations } = params;

    const content = this.exportSingleLocale(projectTranslations, { locale });

    return {
      content,
      fileExtension: "po",
      contentType: "text/x-gettext-translation",
    };
  }
}
