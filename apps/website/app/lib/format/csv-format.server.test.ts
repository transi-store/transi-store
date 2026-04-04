import { describe, it, expect } from "vitest";
import { CsvTranslationFormat } from "./csv-format.server";
import { buildProjectTranslations } from "./test-helpers";

describe("CsvTranslationFormat", () => {
  const format = new CsvTranslationFormat();

  describe("parseImport", () => {
    it("should parse a valid CSV file", () => {
      const csv = `home.title,Accueil
home.subtitle,Bienvenue`;

      const result = format.parseImport(csv);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "home.subtitle": "Bienvenue",
      });
    });

    it("should handle quoted values with commas", () => {
      const csv = `greeting,"Hello, world"
farewell,"Goodbye, friend"`;

      const result = format.parseImport(csv);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: "Hello, world",
        farewell: "Goodbye, friend",
      });
    });

    it("should handle escaped quotes in values", () => {
      const csv = `greeting,"Hello ""world"""`;

      const result = format.parseImport(csv);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: 'Hello "world"',
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
      const csv = `home.title,Accueil

home.subtitle,Bienvenue`;

      const result = format.parseImport(csv);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "home.subtitle": "Bienvenue",
      });
    });
  });

  describe("exportSingleLocale", () => {
    it("should export translations as CSV", () => {
      const translations = buildProjectTranslations(
        { "home.title": "Accueil", "nav.about": "À propos" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, { locale: "fr" });

      expect(result).toBe("home.title,Accueil\nnav.about,À propos");
    });

    it("should quote values containing commas", () => {
      const translations = buildProjectTranslations(
        { greeting: "Hello, world" },
        "en",
      );

      const result = format.exportSingleLocale(translations, { locale: "en" });

      expect(result).toBe('greeting,"Hello, world"');
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

    it("should return CSV content with correct content-type", () => {
      const result = format.handleExportRequest({
        searchParams: new URLSearchParams("locale=fr"),
        projectTranslations: translations,
        projectName: "My Project",
        availableLocales: ["en", "fr"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.contentType).toBe("text/csv");
        expect(result.fileExtension).toBe("csv");
      }
    });
  });
});
