import { describe, it, expect } from "vitest";
import { YamlTranslationFormat } from "./yaml-format.server";
import type { ProjectTranslations } from "./types";

function buildProjectTranslations(
  data: Record<string, string>,
  locale: string,
): ProjectTranslations {
  return Object.entries(data).map(([keyName, value], index) => ({
    id: index + 1,
    projectId: 1,
    keyName,
    description: null,
    branchId: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    translations: [
      {
        id: index + 1,
        keyId: index + 1,
        locale,
        value,
        isFuzzy: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ],
  }));
}

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
      expect(result.error).toContain("YAML invalide");
    });

    it("should return error for array YAML", () => {
      const result = format.parseImport("- item1\n- item2");

      expect(result.success).toBe(false);
      expect(result.error).toContain("objet YAML");
    });

    it("should return error when file is too large", () => {
      const largeContent = "x".repeat(6 * 1024 * 1024);
      const result = format.parseImport(largeContent);

      expect(result.success).toBe(false);
      expect(result.error).toContain("trop volumineux");
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

      expect(result).toContain("home.title: Accueil");
      expect(result).toContain("nav.about: À propos");
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], { locale: "fr" });

      expect(result).toBe("{}");
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

    it("should return YAML content with correct content-type", () => {
      const result = format.handleExportRequest({
        searchParams: new URLSearchParams("locale=fr"),
        projectTranslations: translations,
        projectName: "My Project",
        availableLocales: ["en", "fr"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.contentType).toBe("text/yaml");
        expect(result.fileExtension).toBe("yaml");
      }
    });
  });
});
