import type { TranslationFormat } from "./types";
import { JsonTranslationFormat } from "./json-format.server";
import { XliffTranslationFormat } from "./xliff-format.server";

// TODO make it an enum
export type SupportedFormat = "json" | "xliff";

const SUPPORTED_FORMATS: ReadonlySet<string> = new Set<SupportedFormat>([
  "json",
  "xliff",
]);

export function isSupportedFormat(format: string): format is SupportedFormat {
  return SUPPORTED_FORMATS.has(format);
}

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
