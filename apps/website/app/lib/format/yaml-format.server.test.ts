import { describe, it, expect } from "vitest";
import { YamlTranslationFormat } from "./yaml-format.server";
import { buildProjectTranslations } from "./test-helpers";

describe("YamlTranslationFormat", () => {
  const format = new YamlTranslationFormat();

  describe("parseImport", () => {
    it("should parse a valid flat YAML file", () => {
      const yaml = `home.title: Accueil
home.subtitle: Bienvenue`;

      const result = format.parseImport(yaml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "home.subtitle": "Bienvenue",
      });
    });

    it("should flatten nested YAML structures", () => {
      const yaml = `home:
  title: Accueil
  subtitle: Bienvenue
nav:
  about: À propos`;

      const result = format.parseImport(yaml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "home.subtitle": "Bienvenue",
        "nav.about": "À propos",
      });
    });

    it("should return error for invalid YAML", () => {
      const result = format.parseImport("  :\n  invalid: [unclosed");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid YAML");
    });

    it("should return error for array YAML", () => {
      const result = format.parseImport("- item1\n- item2");

      expect(result.success).toBe(false);
      expect(result.error).toContain("YAML object");
    });

    it("should handle special characters in values", () => {
      const yaml = `greeting: "Hello \\"world\\" & <friends>"
unicode: "Émojis: 🎉🚀"`;

      const result = format.parseImport(yaml);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: 'Hello "world" & <friends>',
        unicode: "Émojis: 🎉🚀",
      });
    });
  });

  describe("exportSingleLocale", () => {
    it("should export translations as YAML", () => {
      const translations = buildProjectTranslations(
        { "home.title": "Accueil", "nav.about": "À propos" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, { locale: "fr" });

      expect(result).toEqual("home.title: Accueil\nnav.about: À propos");
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], { locale: "fr" });

      expect(result).toBe("{}");
    });

    it("should not export data without translations in the target locale", () => {
      const translations = buildProjectTranslations(
        { "home.title": "Accueil", "home.subtitle": "Bienvenue" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, {
        locale: "de",
        fileId: 1,
        filePath: "translations/<lang>.xlf",
      });

      expect(result).toEqual("{}");
    });
  });

  describe("handleExportRequest", () => {
    const translations = buildProjectTranslations(
      { "home.title": "Accueil" },
      "fr",
    );

    it("should return YAML content with correct content-type", () => {
      const result = format.handleExportRequest({
        locale: "fr",
        projectTranslations: translations,
        fileId: 1,
        filePath: "translations/<lang>.yaml",
      });

      expect(result.content).toBe("home.title: Accueil");
      expect(result.contentType).toBe("text/yaml");
      expect(result.fileExtension).toBe("yaml");
    });
  });
});
