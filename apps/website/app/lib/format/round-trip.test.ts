import { describe, it, expect } from "vitest";
import { JsonTranslationFormat } from "./json-format.server";
import { XliffTranslationFormat } from "./xliff-format.server";
import type { ProjectTranslations } from "./types";

/**
 * Round-trip tests: verify that data survives import→export and export→import
 * without loss or corruption.
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

describe("Round-trip: JSON", () => {
  const json = new JsonTranslationFormat();

  it("export then import should produce the same data", () => {
    const originalData = {
      "home.title": "Accueil",
      "home.subtitle": "Bienvenue sur notre site",
      "nav.about": "À propos",
    };

    const translations = buildProjectTranslations(originalData, "fr");
    const exported = json.exportSingleLocale(translations, { locale: "fr" });
    const imported = json.parseImport(exported);

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

    const imported = json.parseImport(originalJson);
    expect(imported.success).toBe(true);

    const translations = buildProjectTranslations(imported.data!, "fr");
    const exported = json.exportSingleLocale(translations, { locale: "fr" });

    expect(exported).toBe(originalJson);
  });

  it("round-trip should preserve special characters", () => {
    const originalData = {
      greeting: 'Hello "world" & <friends>',
      "key.with.dots": "Value with\nnewline",
      unicode: "Émojis: 🎉🚀",
    };

    const translations = buildProjectTranslations(originalData, "en");
    const exported = json.exportSingleLocale(translations, { locale: "en" });
    const imported = json.parseImport(exported);

    expect(imported.success).toBe(true);
    expect(imported.data).toEqual(originalData);
  });
});

describe("Round-trip: XLIFF", () => {
  const xliff = new XliffTranslationFormat();

  it("export then import should produce the same target data", () => {
    const originalData = {
      "home.title": "Accueil",
      "home.subtitle": "Bienvenue sur notre site",
      "nav.about": "À propos",
    };

    const translations = buildProjectTranslations(originalData, "fr");

    const exported = xliff.exportSingleLocale(translations, {
      locale: "fr",
      projectName: "test-project",
    });
    const imported = xliff.parseImport(exported);

    expect(imported.success).toBe(true);
    expect(imported.data).toEqual(originalData);
  });

  it("import then re-export then re-import should preserve data", () => {
    const originalXliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test-project" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="home.title" resname="home.title">
        <source>home.title</source>
        <target>Accueil</target>
      </trans-unit>
      <trans-unit id="nav.about" resname="nav.about">
        <source>nav.about</source>
        <target>À propos</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

    const imported = xliff.parseImport(originalXliff);
    expect(imported.success).toBe(true);

    const translations = buildProjectTranslations(imported.data!, "fr");
    const reExported = xliff.exportSingleLocale(translations, {
      locale: "fr",
      projectName: "test-project",
    });

    const reimported = xliff.parseImport(reExported);
    expect(reimported.success).toBe(true);
    expect(reimported.data).toEqual(imported.data);
  });

  it("round-trip should preserve XML special characters", () => {
    const originalData = {
      "key.with.&special": 'Value with <html> & "quotes"',
    };

    const translations = buildProjectTranslations(originalData, "fr");

    const exported = xliff.exportSingleLocale(translations, {
      locale: "fr",
      projectName: "test",
    });
    const imported = xliff.parseImport(exported);

    expect(imported.success).toBe(true);
    expect(imported.data).toEqual(originalData);
  });
});

describe("Cross-format round-trip", () => {
  const json = new JsonTranslationFormat();
  const xliff = new XliffTranslationFormat();

  it("JSON import → XLIFF export → XLIFF import should preserve data", () => {
    const originalJson = JSON.stringify({
      "home.title": "Accueil",
      "nav.about": "À propos",
    });

    const jsonImported = json.parseImport(originalJson);
    expect(jsonImported.success).toBe(true);

    const translations = buildProjectTranslations(jsonImported.data!, "fr");
    const xliffExported = xliff.exportSingleLocale(translations, {
      locale: "fr",
      projectName: "test",
    });

    const xliffImported = xliff.parseImport(xliffExported);
    expect(xliffImported.success).toBe(true);
    expect(xliffImported.data).toEqual(jsonImported.data);
  });

  it("XLIFF import → JSON export → JSON import should preserve data", () => {
    const originalXliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="home.title" resname="home.title">
        <source>home.title</source>
        <target>Accueil</target>
      </trans-unit>
      <trans-unit id="nav.about" resname="nav.about">
        <source>nav.about</source>
        <target>À propos</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

    const xliffImported = xliff.parseImport(originalXliff);
    expect(xliffImported.success).toBe(true);

    const translations = buildProjectTranslations(xliffImported.data!, "fr");
    const jsonExported = json.exportSingleLocale(translations, {
      locale: "fr",
    });

    const jsonImported = json.parseImport(jsonExported);
    expect(jsonImported.success).toBe(true);
    expect(jsonImported.data).toEqual(xliffImported.data);
  });
});
