import { describe, it, expect } from "vitest";
import { parseImportJSON } from "./import/json.server";
import { parseImportXLIFF } from "./import/xliff.server";
import { exportToJSON } from "./export/json.server";
import { exportToXLIFF } from "./export/xliff.server";
import type { ProjectTranslations } from "./translation-keys.server";

/**
 * Round-trip tests: verify that data survives import→export and export→import
 * without loss or corruption, using the current function implementations.
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

function buildProjectTranslationsWithSource(
  data: Record<string, string>,
  targetLocale: string,
  sourceData: Record<string, string>,
  sourceLocale: string,
): ProjectTranslations {
  return Object.entries(data).map(([keyName, value], index) => ({
    id: index + 1,
    projectId: 1,
    keyName,
    description: null,
    branchId: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    translations: [
      {
        id: index * 2 + 1,
        keyId: index + 1,
        locale: sourceLocale,
        value: sourceData[keyName],
        isFuzzy: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        id: index * 2 + 2,
        keyId: index + 1,
        locale: targetLocale,
        value,
        isFuzzy: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ],
  }));
}

describe("Round-trip: JSON", () => {
  it("export then import should produce the same data", () => {
    const originalData = {
      "home.title": "Accueil",
      "home.subtitle": "Bienvenue sur notre site",
      "nav.about": "À propos",
    };

    const translations = buildProjectTranslations(originalData, "fr");
    const exported = exportToJSON(translations, "fr");
    const imported = parseImportJSON(exported);

    expect(imported.success).toBe(true);
    expect(imported.data).toEqual(originalData);
  });

  it("import then export should produce the same JSON string", () => {
    const originalJson = JSON.stringify(
      {
        "home.title": "Accueil",
        "home.subtitle": "Bienvenue",
      },
      null,
      2,
    );

    const imported = parseImportJSON(originalJson);
    expect(imported.success).toBe(true);

    const translations = buildProjectTranslations(imported.data!, "fr");
    const exported = exportToJSON(translations, "fr");

    expect(exported).toBe(originalJson);
  });

  it("round-trip should preserve special characters", () => {
    const originalData = {
      greeting: 'Hello "world" & <friends>',
      "key.with.dots": "Value with\nnewline",
      unicode: "Émojis: 🎉🚀",
    };

    const translations = buildProjectTranslations(originalData, "en");
    const exported = exportToJSON(translations, "en");
    const imported = parseImportJSON(exported);

    expect(imported.success).toBe(true);
    expect(imported.data).toEqual(originalData);
  });
});

describe("Round-trip: XLIFF", () => {
  it("export then import should produce the same target data", () => {
    const originalData = {
      "home.title": "Accueil",
      "home.subtitle": "Bienvenue sur notre site",
      "nav.about": "À propos",
    };
    const sourceData = {
      "home.title": "Home",
      "home.subtitle": "Welcome to our site",
      "nav.about": "About",
    };

    const translations = buildProjectTranslationsWithSource(
      originalData,
      "fr",
      sourceData,
      "en",
    );

    const exported = exportToXLIFF(translations, "en", "fr", "test-project");
    const imported = parseImportXLIFF(exported);

    expect(imported.success).toBe(true);
    expect(imported.data).toEqual(originalData);
  });

  it("import then re-export then re-import should preserve data", () => {
    const originalXliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test-project">
    <unit id="home.title">
      <segment>
        <source>Home</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="nav.about">
      <segment>
        <source>About</source>
        <target>À propos</target>
      </segment>
    </unit>
  </file>
</xliff>`;

    // 1. Import from XLIFF
    const imported = parseImportXLIFF(originalXliff);
    expect(imported.success).toBe(true);

    // 2. Build ProjectTranslations and re-export
    const sourceData: Record<string, string> = {
      "home.title": "Home",
      "nav.about": "About",
    };
    const translations = buildProjectTranslationsWithSource(
      imported.data!,
      "fr",
      sourceData,
      "en",
    );
    const reExported = exportToXLIFF(translations, "en", "fr", "test-project");

    // 3. Re-import and verify data is identical
    const reimported = parseImportXLIFF(reExported);
    expect(reimported.success).toBe(true);
    expect(reimported.data).toEqual(imported.data);
  });

  it("round-trip should preserve XML special characters", () => {
    const originalData = {
      "key.with.&special": 'Value with <html> & "quotes"',
    };
    const sourceData = {
      "key.with.&special": "Source value",
    };

    const translations = buildProjectTranslationsWithSource(
      originalData,
      "fr",
      sourceData,
      "en",
    );

    const exported = exportToXLIFF(translations, "en", "fr", "test");
    const imported = parseImportXLIFF(exported);

    expect(imported.success).toBe(true);
    expect(imported.data).toEqual(originalData);
  });
});

describe("Cross-format round-trip", () => {
  it("JSON import → XLIFF export → XLIFF import should preserve data", () => {
    const originalJson = JSON.stringify({
      "home.title": "Accueil",
      "nav.about": "À propos",
    });

    // 1. Import from JSON
    const jsonImported = parseImportJSON(originalJson);
    expect(jsonImported.success).toBe(true);

    // 2. Build ProjectTranslations and export to XLIFF
    const sourceData = Object.fromEntries(
      Object.keys(jsonImported.data!).map((k) => [k, `source_${k}`]),
    );
    const translations = buildProjectTranslationsWithSource(
      jsonImported.data!,
      "fr",
      sourceData,
      "en",
    );
    const xliffExported = exportToXLIFF(translations, "en", "fr", "test");

    // 3. Import from XLIFF
    const xliffImported = parseImportXLIFF(xliffExported);
    expect(xliffImported.success).toBe(true);
    expect(xliffImported.data).toEqual(jsonImported.data);
  });

  it("XLIFF import → JSON export → JSON import should preserve data", () => {
    const originalXliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="home.title">
      <segment>
        <source>Home</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="nav.about">
      <segment>
        <source>About</source>
        <target>À propos</target>
      </segment>
    </unit>
  </file>
</xliff>`;

    // 1. Import from XLIFF
    const xliffImported = parseImportXLIFF(originalXliff);
    expect(xliffImported.success).toBe(true);

    // 2. Build ProjectTranslations and export to JSON
    const translations = buildProjectTranslations(xliffImported.data!, "fr");
    const jsonExported = exportToJSON(translations, "fr");

    // 3. Import from JSON
    const jsonImported = parseImportJSON(jsonExported);
    expect(jsonImported.success).toBe(true);
    expect(jsonImported.data).toEqual(xliffImported.data);
  });
});
