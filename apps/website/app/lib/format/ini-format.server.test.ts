import { describe, it, expect } from "vitest";
import { IniTranslationFormat } from "./ini-format.server";
import { buildProjectTranslations } from "./test-helpers";

describe("IniTranslationFormat", () => {
  const format = new IniTranslationFormat();

  describe("parseImport", () => {
    it("should parse a valid INI file", () => {
      const ini = `home.title=Accueil
home.subtitle=Bienvenue`;

      const result = format.parseImport(ini);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "home.subtitle": "Bienvenue",
      });
    });

    it("should handle quoted values", () => {
      const ini = `greeting="Hello world"
farewell='Goodbye'`;

      const result = format.parseImport(ini);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: "Hello world",
        farewell: "Goodbye",
      });
    });

    it("should skip comment lines", () => {
      const ini = `; This is a comment
# Another comment
greeting=Bonjour`;

      const result = format.parseImport(ini);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: "Bonjour",
      });
    });

    it("should skip section headers", () => {
      const ini = `[section]
greeting=Bonjour`;

      const result = format.parseImport(ini);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: "Bonjour",
      });
    });

    it("should handle values with equals signs", () => {
      const ini = `equation=1+1=2`;

      const result = format.parseImport(ini);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        equation: "1+1=2",
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

    it("should skip empty lines", () => {
      const ini = `home.title=Accueil

home.subtitle=Bienvenue`;

      const result = format.parseImport(ini);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "home.subtitle": "Bienvenue",
      });
    });
  });

  describe("exportSingleLocale", () => {
    it("should export translations as INI", () => {
      const translations = buildProjectTranslations(
        { "home.title": "Accueil", "nav.about": "À propos" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, { locale: "fr" });

      expect(result).toBe("home.title=Accueil\nnav.about=À propos");
    });

    it("should quote values with special characters", () => {
      const translations = buildProjectTranslations(
        { greeting: 'Hello "world"' },
        "en",
      );

      const result = format.exportSingleLocale(translations, { locale: "en" });

      expect(result).toBe('greeting="Hello \\"world\\""');
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], { locale: "fr" });

      expect(result).toBe("");
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

    it("should return INI content with correct content-type", () => {
      const result = format.handleExportRequest({
        searchParams: new URLSearchParams("locale=fr"),
        projectTranslations: translations,
        projectName: "My Project",
        availableLocales: ["en", "fr"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.contentType).toBe("text/plain");
        expect(result.fileExtension).toBe("ini");
      }
    });
  });
});
