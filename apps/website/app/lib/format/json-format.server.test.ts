import { describe, it, expect } from "vitest";
import { JsonTranslationFormat } from "./json-format.server";
import { buildProjectTranslations } from "./test-helpers";

describe("JsonTranslationFormat", () => {
  const format = new JsonTranslationFormat();

  describe("parseImport", () => {
    it("should parse a valid JSON file", () => {
      const data = {
        "home.title": "Accueil",
        "home.subtitle": "Bienvenue",
      };

      const result = format.parseImport(JSON.stringify(data));

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("should return error for invalid JSON", () => {
      const result = format.parseImport("not valid json {");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Format JSON invalide");
    });

    it("should return error for array JSON", () => {
      const result = format.parseImport('["a", "b"]');

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Le fichier doit contenir un objet JSON avec des paires clé/valeur",
      );
    });

    it("should return error for null JSON", () => {
      const result = format.parseImport("null");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Le fichier doit contenir un objet JSON avec des paires clé/valeur",
      );
    });

    it("should return error when file is too large", () => {
      const largeContent = JSON.stringify({ key: "x".repeat(6 * 1024 * 1024) });

      const result = format.parseImport(largeContent);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Le fichier est trop volumineux (maximum 5 MB)",
      );
    });

    it("should handle empty object", () => {
      const result = format.parseImport("{}");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it("should handle special characters in values", () => {
      const data = { greeting: 'Hello "world" & <friends>' };

      const result = format.parseImport(JSON.stringify(data));

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("should handle unicode and emojis", () => {
      const data = { emoji: "Émojis: 🎉🚀", accents: "àéîôü" };

      const result = format.parseImport(JSON.stringify(data));

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });
  });

  describe("exportSingleLocale", () => {
    it("should export translations for a single locale", () => {
      const data = { "home.title": "Accueil", "home.subtitle": "Bienvenue" };

      const translations = buildProjectTranslations(data, "fr");

      const result = format.exportSingleLocale(translations, { locale: "fr" });
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(data);
    });

    it("should return empty object when locale has no translations", () => {
      const data = { "home.title": "Accueil" };
      const translations = buildProjectTranslations(data, "fr");

      const result = format.exportSingleLocale(translations, { locale: "de" });
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({});
    });

    it("should produce formatted JSON with 2-space indent", () => {
      const data = { "home.title": "Accueil" };
      const translations = buildProjectTranslations(data, "fr");

      const result = format.exportSingleLocale(translations, { locale: "fr" });

      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it("should preserve special characters in values", () => {
      const data = { greeting: 'Hello "world" & <friends>' };
      const translations = buildProjectTranslations(data, "en");

      const result = format.exportSingleLocale(translations, { locale: "en" });
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(data);
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], { locale: "fr" });
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({});
    });
  });

  describe("handleExportRequest", () => {
    const translations = buildProjectTranslations(
      { "home.title": "Accueil" },
      "fr",
    );

    it("should return JSON content with correct content-type", () => {
      const result = format.handleExportRequest({
        locale: "fr",
        projectTranslations: translations,
        projectName: "My Project",
      });

      expect(result.contentType).toBe("application/json");
      expect(result.fileExtension).toBe("json");
      expect(JSON.parse(result.content)).toEqual({
        "home.title": "Accueil",
      });
    });
  });
});
