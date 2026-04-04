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

    it("should return error when file is too large", () => {
      const largeContent = "x".repeat(6 * 1024 * 1024);
      const result = format.parseImport(largeContent);

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

      expect(result).toContain('msgid "home.title"');
      expect(result).toContain('msgstr "Accueil"');
      expect(result).toContain('"Language: fr\\n"');
    });

    it("should include PO header", () => {
      const translations = buildProjectTranslations({ key: "value" }, "fr");

      const result = format.exportSingleLocale(translations, { locale: "fr" });

      expect(result).toContain('msgid ""');
      expect(result).toContain('msgstr ""');
      expect(result).toContain("Content-Type: text/plain; charset=UTF-8");
    });

    it("should escape special characters", () => {
      const translations = buildProjectTranslations(
        { greeting: 'Hello "world"\nNew line' },
        "en",
      );

      const result = format.exportSingleLocale(translations, { locale: "en" });

      expect(result).toContain('msgstr "Hello \\"world\\"\\nNew line"');
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], { locale: "fr" });

      // Should still have header
      expect(result).toContain('msgid ""');
      expect(result).toContain('msgstr ""');
    });
  });

  describe("handleExportRequest", () => {
    const translations = buildProjectTranslations(
      { "home.title": "Accueil" },
      "fr",
    );

    it("should return error when locale is missing", () => {
      const result = format.handleExportRequest({
        searchParams: new URLSearchParams(),
        projectTranslations: translations,
        projectName: "My Project",
        availableLocales: ["en", "fr"],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("locale");
      }
    });

    it("should return PO content with correct content-type", () => {
      const result = format.handleExportRequest({
        searchParams: new URLSearchParams("locale=fr"),
        projectTranslations: translations,
        projectName: "My Project",
        availableLocales: ["en", "fr"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.contentType).toBe("text/x-gettext-translation");
        expect(result.fileExtension).toBe("po");
      }
    });
  });
});
