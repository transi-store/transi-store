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
      const data: Record<string, string> = {};

      // Split into blocks separated by blank lines
      const blocks = fileContent.split(/\n\n+/);

      for (const block of blocks) {
        const lines = block.split("\n");

        let msgid = "";
        let msgstr = "";
        let readingMsgid = false;
        let readingMsgstr = false;

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed.startsWith("#")) {
            continue;
          }

          if (trimmed.startsWith("msgid ")) {
            readingMsgid = true;
            readingMsgstr = false;
            msgid = extractQuotedString(trimmed.slice(6));
          } else if (trimmed.startsWith("msgstr ")) {
            readingMsgstr = true;
            readingMsgid = false;
            msgstr = extractQuotedString(trimmed.slice(7));
          } else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            // Continuation line
            const continued = extractQuotedString(trimmed);
            if (readingMsgid && !readingMsgstr) {
              msgid += continued;
            } else if (readingMsgstr) {
              msgstr += continued;
            }
          }
        }

        // Skip the header entry (empty msgid)
        if (msgid && msgstr) {
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
    const lines: Array<string> = [];

    // PO header
    lines.push('msgid ""');
    lines.push('msgstr ""');
    lines.push('"Content-Type: text/plain; charset=UTF-8\\n"');
    lines.push('"Content-Transfer-Encoding: 8bit\\n"');
    lines.push('"Language: ' + escapePoString(options.locale) + '\\n"');
    lines.push("");

    for (const key of projectTranslations) {
      const translation = key.translations.find(
        (t) => t.locale === options.locale,
      );

      if (translation) {
        lines.push("msgid " + quotePoString(key.keyName));
        lines.push("msgstr " + quotePoString(translation.value));
        lines.push("");
      }
    }

    // Remove trailing empty line
    if (lines[lines.length - 1] === "") {
      lines.pop();
    }

    return lines.join("\n");
  }

  handleExportRequest(params: ExportRequestParams): ExportRequestResult {
    const { searchParams, projectTranslations, availableLocales } = params;

    const locale = searchParams.get("locale");

    if (!locale) {
      return {
        success: false,
        error: "Missing 'locale' parameter. Use ?format=po&locale=fr",
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
      fileExtension: "po",
      contentType: "text/x-gettext-translation",
    };
  }
}

function escapePoString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

function quotePoString(str: string): string {
  return '"' + escapePoString(str) + '"';
}

function extractQuotedString(str: string): string {
  const trimmed = str.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const inner = trimmed.slice(1, -1);
    return unescapePoString(inner);
  }

  return trimmed;
}

function unescapePoString(str: string): string {
  let result = "";
  let i = 0;

  while (i < str.length) {
    if (str[i] === "\\" && i + 1 < str.length) {
      const next = str[i + 1];
      if (next === "n") {
        result += "\n";
        i += 2;
      } else if (next === "t") {
        result += "\t";
        i += 2;
      } else if (next === "\\") {
        result += "\\";
        i += 2;
      } else if (next === '"') {
        result += '"';
        i += 2;
      } else {
        result += str[i];
        i++;
      }
    } else {
      result += str[i];
      i++;
    }
  }

  return result;
}
