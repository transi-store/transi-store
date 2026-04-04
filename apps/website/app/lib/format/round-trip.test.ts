import { describe, it, expect } from "vitest";
import { createTranslationFormat } from "./format-factory.server";
import { SupportedFormat } from "./types";
import type { ProjectTranslations, TranslationFormat } from "./types";

/**
 * Round-trip tests: verify that data survives import→export→import
 * without loss or corruption, across all supported formats.
 *
 * The test starts from JS translation data, exports to each format,
 * then reimports and validates the result matches the original data.
 */

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

/**
 * Base translation data used for all round-trip tests.
 * This represents the "source of truth" from which we export then reimport.
 */
const baseTranslations: Record<string, string> = {
  "home.title": "Accueil",
  "home.subtitle": "Bienvenue sur notre site",
  "nav.about": "À propos",
  "nav.contact": "Contact",
};

/**
 * Translations with special characters to test escaping round-trips.
 * INI format cannot round-trip newlines in values, so it is excluded.
 */
const specialCharTranslations: Record<string, string> = {
  greeting: 'Hello "world" & <friends>',
  unicode: "Émojis: 🎉🚀",
};

type FormatConfig = {
  name: string;
  format: SupportedFormat;
  /** Extra options required by the format (e.g. projectName for XLIFF) */
  exportOptions?: { projectName?: string };
};

/**
 * All formats that participate in round-trip testing.
 */
const allFormats: Array<FormatConfig> = [
  { name: "JSON", format: SupportedFormat.JSON },
  {
    name: "XLIFF",
    format: SupportedFormat.XLIFF,
    exportOptions: { projectName: "test-project" },
  },
  { name: "YAML", format: SupportedFormat.YAML },
  { name: "CSV", format: SupportedFormat.CSV },
  { name: "PO", format: SupportedFormat.PO },
  { name: "INI", format: SupportedFormat.INI },
  { name: "PHP", format: SupportedFormat.PHP },
];

function getFormat(config: FormatConfig): TranslationFormat {
  return createTranslationFormat(config.format);
}

describe("Round-trip: export → import for each format", () => {
  it.each(allFormats)(
    "$name: export then import should produce the same data",
    (config) => {
      const format = getFormat(config);
      const translations = buildProjectTranslations(baseTranslations, "fr");

      const exported = format.exportSingleLocale(translations, {
        locale: "fr",
        ...config.exportOptions,
      });
      const imported = format.parseImport(exported);

      expect(imported.success).toBe(true);
      expect(imported.data).toEqual(baseTranslations);
    },
  );

  it.each(allFormats)(
    "$name: import → export → import should preserve data (double round-trip)",
    (config) => {
      const format = getFormat(config);
      const translations = buildProjectTranslations(baseTranslations, "fr");

      // First export
      const exported1 = format.exportSingleLocale(translations, {
        locale: "fr",
        ...config.exportOptions,
      });

      // Import
      const imported1 = format.parseImport(exported1);
      expect(imported1.success).toBe(true);

      // Re-export from imported data
      const translations2 = buildProjectTranslations(imported1.data!, "fr");
      const exported2 = format.exportSingleLocale(translations2, {
        locale: "fr",
        ...config.exportOptions,
      });

      // Re-import
      const imported2 = format.parseImport(exported2);
      expect(imported2.success).toBe(true);
      expect(imported2.data).toEqual(imported1.data);
    },
  );

  /**
   * INI format cannot round-trip newlines in values (they get lost),
   * so we test special characters only for formats that support them.
   */
  const formatsWithSpecialCharSupport = allFormats.filter(
    (f) => f.format !== SupportedFormat.INI,
  );

  it.each(formatsWithSpecialCharSupport)(
    "$name: round-trip should preserve special characters",
    (config) => {
      const format = getFormat(config);
      const translations = buildProjectTranslations(
        specialCharTranslations,
        "en",
      );

      const exported = format.exportSingleLocale(translations, {
        locale: "en",
        ...config.exportOptions,
      });
      const imported = format.parseImport(exported);

      expect(imported.success).toBe(true);
      expect(imported.data).toEqual(specialCharTranslations);
    },
  );
});

describe("Cross-format round-trip", () => {
  /**
   * Generate all pairs of distinct formats for cross-format testing.
   */
  const crossFormatPairs = allFormats.flatMap((source) =>
    allFormats
      .filter((target) => target.format !== source.format)
      .map((target) => ({
        sourceName: source.name,
        targetName: target.name,
        source,
        target,
      })),
  );

  it.each(crossFormatPairs)(
    "$sourceName → $targetName → $sourceName should preserve data",
    ({ source, target }) => {
      const sourceFormat = getFormat(source);
      const targetFormat = getFormat(target);

      // Export from source format
      const translations = buildProjectTranslations(baseTranslations, "fr");
      const sourceExported = sourceFormat.exportSingleLocale(translations, {
        locale: "fr",
        ...source.exportOptions,
      });

      // Import in source format
      const sourceImported = sourceFormat.parseImport(sourceExported);
      expect(sourceImported.success).toBe(true);

      // Export to target format
      const targetTranslations = buildProjectTranslations(
        sourceImported.data!,
        "fr",
      );
      const targetExported = targetFormat.exportSingleLocale(
        targetTranslations,
        {
          locale: "fr",
          ...target.exportOptions,
        },
      );

      // Import from target format
      const targetImported = targetFormat.parseImport(targetExported);
      expect(targetImported.success).toBe(true);
      expect(targetImported.data).toEqual(sourceImported.data);
    },
  );
});
