import { describe, it, expect } from "vitest";
import { exportToJSON, exportAllLanguagesToJSON } from "./json.server";
import type { ProjectTranslations } from "../translation-keys.server";

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

describe("exportToJSON", () => {
  it("should export translations for a single locale", () => {
    const data = { "home.title": "Accueil", "home.subtitle": "Bienvenue" };

    const translations = buildProjectTranslations(data, "fr");

    const result = exportToJSON(translations, "fr");
    const parsed = JSON.parse(result);

    expect(parsed).toEqual(data);
  });

  it("should return empty object when locale has no translations", () => {
    const data = { "home.title": "Accueil" };
    const translations = buildProjectTranslations(data, "fr");

    const result = exportToJSON(translations, "de");
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({});
  });

  it("should produce formatted JSON with 2-space indent", () => {
    const data = { "home.title": "Accueil" };
    const translations = buildProjectTranslations(data, "fr");

    const result = exportToJSON(translations, "fr");

    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  it("should preserve special characters in values", () => {
    const data = { greeting: 'Hello "world" & <friends>' };
    const translations = buildProjectTranslations(data, "en");

    const result = exportToJSON(translations, "en");
    const parsed = JSON.parse(result);

    expect(parsed).toEqual(data);
  });

  it("should handle empty translations list", () => {
    const result = exportToJSON([], "fr");
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({});
  });
});

describe("exportAllLanguagesToJSON", () => {
  it("should export all locales as nested object", () => {
    const data = {
      en: { "home.title": "Home", "home.subtitle": "Welcome" },
      fr: { "home.title": "Accueil", "home.subtitle": "Bienvenue" },
    };

    const translations = buildMultiLocaleProjectTranslations(data);

    const result = exportAllLanguagesToJSON(translations, ["en", "fr"]);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual(data);
  });

  it("should handle missing translations for some locales", () => {
    const data = {
      en: { "home.title": "Home", "home.subtitle": "Welcome" },
      fr: { "home.title": "Accueil" },
    };
    const translations = buildMultiLocaleProjectTranslations(data);

    const result = exportAllLanguagesToJSON(translations, ["en", "fr"]);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual(data);
  });

  it("should return empty objects for locales with no translations", () => {
    const data = { "home.title": "Home" };

    const translations = buildProjectTranslations(data, "en");

    const result = exportAllLanguagesToJSON(translations, ["en", "de"]);
    const parsed = JSON.parse(result);

    expect(parsed.en).toEqual(data);
    expect(parsed.de).toEqual({});
  });

  it("should handle empty translations list", () => {
    const result = exportAllLanguagesToJSON([], ["en", "fr"]);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual({ en: {}, fr: {} });
  });
});
