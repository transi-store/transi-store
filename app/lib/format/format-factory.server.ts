import type { TranslationFormat } from "./types";
import { JsonTranslationFormat } from "./json-format.server";
import { XliffTranslationFormat } from "./xliff-format.server";

// TODO make it an enum
export type SupportedFormat = "json" | "xliff";

export function createTranslationFormat(
  format: SupportedFormat,
): TranslationFormat {
  switch (format) {
    case "json":
      return new JsonTranslationFormat();
    case "xliff":
      return new XliffTranslationFormat();
  }
}
