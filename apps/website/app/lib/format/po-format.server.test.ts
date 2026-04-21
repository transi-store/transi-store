import { describe, it, expect } from "vitest";
import { PoTranslationFormat } from "./po-format.server";
import { buildProjectTranslations } from "./test-helpers";

describe("PoTranslationFormat", () => {
  const format = new PoTranslationFormat();

  describe("parseImport", () => {
    it("should parse a valid PO file", () => {
      const po = `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "home.title"
msgstr "Accueil"

msgid "nav.about"
msgstr "À propos"`;

      const result = format.parseImport(po);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "nav.about": "À propos",
      });
    });

    it("should skip the header entry (empty msgid)", () => {
      const po = `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "greeting"
msgstr "Bonjour"`;

      const result = format.parseImport(po);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: "Bonjour",
      });
    });

    it("should handle escaped characters", () => {
      const po = `msgid "greeting"
msgstr "Hello \\"world\\""`;

      const result = format.parseImport(po);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: 'Hello "world"',
      });
    });

    it("should handle newlines in values", () => {
      const po = `msgid "multiline"
msgstr "Line 1\\nLine 2"`;

      const result = format.parseImport(po);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        multiline: "Line 1\nLine 2",
      });
    });

    it("should handle multi-line string continuation", () => {
      const po = `msgid "greeting"
msgstr ""
"Hello "
"world"`;

      const result = format.parseImport(po);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: "Hello world",
      });
    });

    it("should skip comment lines", () => {
      const po = `# This is a comment
#. Translator comment
msgid "greeting"
msgstr "Bonjour"`;

      const result = format.parseImport(po);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: "Bonjour",
      });
    });

    it("should return error for empty content", () => {
      const result = format.parseImport("");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No translations found");
    });
  });

  describe("exportSingleLocale", () => {
    it("should export translations as PO format", () => {
      const translations = buildProjectTranslations(
        { "home.title": "Accueil" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, { locale: "fr" });

      expect(result).toEqual(`msgid ""
msgstr ""
"Content-Type: text/plain; charset=utf-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Language: fr\\n"

msgid "home.title"
msgstr "Accueil"`);
    });

    it("should include PO header", () => {
      const translations = buildProjectTranslations({ key: "value" }, "fr");

      const result = format.exportSingleLocale(translations, { locale: "fr" });

      expect(result).toEqual(`msgid ""
msgstr ""
"Content-Type: text/plain; charset=utf-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Language: fr\\n"

msgid "key"
msgstr "value"`);
    });

    it("should escape special characters (round-trip)", () => {
      const translations = buildProjectTranslations(
        { greeting: 'Hello "world"\nNew line' },
        "en",
      );

      const result = format.exportSingleLocale(translations, { locale: "en" });

      expect(result).toEqual(`msgid ""
msgstr ""
"Content-Type: text/plain; charset=utf-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Language: en\\n"

msgid "greeting"
msgstr ""
"Hello \\"world\\"\\n"
"New line"`);
      const reimported = format.parseImport(result);
      expect(reimported.success).toBe(true);
      expect(reimported.data?.greeting).toBe('Hello "world"\nNew line');
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], { locale: "fr" });

      expect(result).toEqual(`msgid ""
msgstr ""
"Content-Type: text/plain; charset=utf-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Language: fr\\n"`);
    });
  });

  describe("handleExportRequest", () => {
    const translations = buildProjectTranslations(
      { "home.title": "Accueil" },
      "fr",
    );

    it("should return PO content with correct content-type", () => {
      const result = format.handleExportRequest({
        locale: "fr",
        projectTranslations: translations,
        fileId: "my-project-id",
      });

      expect(result.content).toEqual(`msgid ""
msgstr ""
"Content-Type: text/plain; charset=utf-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Language: fr\\n"

msgid "home.title"
msgstr "Accueil"`);
      expect(result.contentType).toBe("text/x-gettext-translation");
      expect(result.fileExtension).toBe("po");
    });
  });
});
