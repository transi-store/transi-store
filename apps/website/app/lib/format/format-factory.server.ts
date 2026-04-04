import { type TranslationFormat, SupportedFormat } from "./types";
import { JsonTranslationFormat } from "./json-format.server";
import { XliffTranslationFormat } from "./xliff-format.server";
import { YamlTranslationFormat } from "./yaml-format.server";
import { CsvTranslationFormat } from "./csv-format.server";
import { PoTranslationFormat } from "./po-format.server";
import { IniTranslationFormat } from "./ini-format.server";
import { PhpTranslationFormat } from "./php-format.server";

export function createTranslationFormat(
  format: SupportedFormat,
): TranslationFormat {
  switch (format) {
    case SupportedFormat.JSON:
      return new JsonTranslationFormat();
    case SupportedFormat.XLIFF:
      return new XliffTranslationFormat();
    case SupportedFormat.YAML:
      return new YamlTranslationFormat();
    case SupportedFormat.CSV:
      return new CsvTranslationFormat();
    case SupportedFormat.PO:
      return new PoTranslationFormat();
    case SupportedFormat.INI:
      return new IniTranslationFormat();
    case SupportedFormat.PHP:
      return new PhpTranslationFormat();
  }
}
