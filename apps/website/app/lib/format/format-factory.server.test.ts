import { describe, it, expect } from "vitest";
import { SupportedFormat } from "@transi-store/common";
import {
  createTranslationFormat,
  DocumentFormatNotSupportedError,
} from "./format-factory.server";
import { JsonTranslationFormat } from "./json-format.server";
import { XliffTranslationFormat } from "./xliff-format.server";
import { YamlTranslationFormat } from "./yaml-format.server";
import { CsvTranslationFormat } from "./csv-format.server";
import { PoTranslationFormat } from "./po-format.server";
import { IniTranslationFormat } from "./ini-format.server";
import { PhpTranslationFormat } from "./php-format.server";

describe("createTranslationFormat", () => {
  it.each([
    [SupportedFormat.JSON, JsonTranslationFormat],
    [SupportedFormat.XLIFF, XliffTranslationFormat],
    [SupportedFormat.YAML, YamlTranslationFormat],
    [SupportedFormat.CSV, CsvTranslationFormat],
    [SupportedFormat.PO, PoTranslationFormat],
    [SupportedFormat.INI, IniTranslationFormat],
    [SupportedFormat.PHP, PhpTranslationFormat],
  ])("returns the matching adapter for %s", (format, ctor) => {
    const adapter = createTranslationFormat(format);
    expect(adapter).toBeInstanceOf(ctor);
  });

  it.each([SupportedFormat.MARKDOWN, SupportedFormat.MDX])(
    "throws DocumentFormatNotSupportedError for %s",
    (format) => {
      expect(() => createTranslationFormat(format)).toThrow(
        DocumentFormatNotSupportedError,
      );
    },
  );

  it("error message points to the dedicated document module", () => {
    try {
      createTranslationFormat(SupportedFormat.MARKDOWN);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(DocumentFormatNotSupportedError);
      expect((err as Error).message).toContain("markdown-documents.server");
    }
  });
});
