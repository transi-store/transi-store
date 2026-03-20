import { type TranslationFormat, SupportedFormat } from "./types";
import { JsonTranslationFormat } from "./json-format.server";
import { XliffTranslationFormat } from "./xliff-format.server";

export function createTranslationFormat(
  format: SupportedFormat,
): TranslationFormat {
  switch (format) {
    case SupportedFormat.JSON:
      return new JsonTranslationFormat();
    case SupportedFormat.XLIFF:
      return new XliffTranslationFormat();
  }
}
