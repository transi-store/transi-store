import { describe, it, expect } from "vitest";
import { JsonTranslationFormat } from "./json-format.server";
import type { ProjectTranslations } from "./types";

function buildProjectTranslations(
  data: Record<string, string>,
  locale: string,
): ProjectTranslations {
  return Object.entries(data).map(
    ([keyName, value], index): ProjectTranslations[number] => ({
      id: index + 1,
      projectId: 1,
      keyName,
      description: null,
      branchId: null,
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
    }),
  );
}

function buildMultiLocaleProjectTranslations(
  data: Record<string, Record<string, string>>,
): ProjectTranslations {
  const allKeys = new Set<string>();
  for (const localeData of Object.values(data)) {
    for (const key of Object.keys(localeData)) {
      allKeys.add(key);
    }
  }

  const locales = Object.keys(data);

  return [...allKeys]
    .sort()
    .map((keyName, index): ProjectTranslations[number] => ({
      id: index + 1,
      projectId: 1,
      keyName,
      description: null,
      branchId: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      translations: locales
        .filter((locale) => data[locale][keyName] !== undefined)
        .map((locale, tIndex) => ({
          id: index * locales.length + tIndex + 1,
          keyId: index + 1,
          locale,
          value: data[locale][keyName],
          isFuzzy: false,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        })),
    }));
}

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

  describe("exportAllLocales", () => {
    it("should export all locales as nested object", () => {
      const data = {
        en: { "home.title": "Home", "home.subtitle": "Welcome" },
        fr: { "home.title": "Accueil", "home.subtitle": "Bienvenue" },
      };

      const translations = buildMultiLocaleProjectTranslations(data);

      const result = format.exportAllLocales(translations, ["en", "fr"]);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(data);
    });

    it("should handle missing translations for some locales", () => {
      const data = {
        en: { "home.title": "Home", "home.subtitle": "Welcome" },
        fr: { "home.title": "Accueil" },
      };
      const translations = buildMultiLocaleProjectTranslations(data);

      const result = format.exportAllLocales(translations, ["en", "fr"]);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(data);
    });

    it("should return empty objects for locales with no translations", () => {
      const data = { "home.title": "Home" };

      const translations = buildProjectTranslations(data, "en");

      const result = format.exportAllLocales(translations, ["en", "de"]);
      const parsed = JSON.parse(result);

      expect(parsed.en).toEqual(data);
      expect(parsed.de).toEqual({});
    });

    it("should handle empty translations list", () => {
      const result = format.exportAllLocales([], ["en", "fr"]);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({ en: {}, fr: {} });
    });
  });
});
