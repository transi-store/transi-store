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

    it("should ignore entries under section headers", () => {
      const ini = `[section]
greeting=Bonjour`;

      const result = format.parseImport(ini);

      // The ini package groups entries under sections as nested objects,
      // which are not picked up as top-level string translations
      expect(result.success).toBe(false);
      expect(result.error).toContain("No translations found");
    });

    it("should parse entries before any section header", () => {
      const ini = `greeting=Bonjour
[section]
other=Value`;

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

    it("should handle values with special characters (round-trip)", () => {
      const translations = buildProjectTranslations(
        { greeting: 'Hello "world"' },
        "en",
      );

      const exported = format.exportSingleLocale(translations, {
        locale: "en",
      });
      const reimported = format.parseImport(exported);

      expect(reimported.success).toBe(true);
      expect(reimported.data).toEqual({ greeting: 'Hello "world"' });
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], { locale: "fr" });

      expect(result).toBe("");
    });

    it("should not export data without translations in the target locale", () => {
      const translations = buildProjectTranslations(
        { "home.title": "Accueil", "home.subtitle": "Bienvenue" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, { locale: "de" });

      expect(result).toBe("");
    });
  });

  describe("handleExportRequest", () => {
    const translations = buildProjectTranslations(
      { "home.title": "Accueil" },
      "fr",
    );

    it("should return INI content with correct content-type", () => {
      const result = format.handleExportRequest({
        locale: "fr",
        projectTranslations: translations,
        fileId: 1,
        filePath: "translations/<lang>.ini",
      });

      expect(result.content).toBe("home.title=Accueil");
      expect(result.contentType).toBe("text/plain");
      expect(result.fileExtension).toBe("ini");
    });
  });
});
