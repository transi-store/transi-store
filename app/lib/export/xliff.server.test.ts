import { describe, it, expect } from "vitest";
import { exportToXLIFF } from "./xliff.server";
import type { ProjectTranslations } from "../translation-keys.server";

function buildProjectTranslationsWithSource(
  data: Record<string, string>,
  targetLocale: string,
  sourceData: Record<string, string>,
  sourceLocale: string,
  descriptions?: Record<string, string>,
): ProjectTranslations {
  return Object.entries(data).map(([keyName, value], index) => {
    const translations = [];

    const sourceValue = sourceData[keyName];
    if (sourceValue !== undefined) {
      translations.push({
        id: index * 2 + 1,
        keyId: index + 1,
        locale: sourceLocale,
        value: sourceValue,
        isFuzzy: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });
    }

    translations.push({
      id: index * 2 + 2,
      keyId: index + 1,
      locale: targetLocale,
      value,
      isFuzzy: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    });

    return {
      id: index + 1,
      projectId: 1,
      keyName,
      description: descriptions?.[keyName] ?? null,
      branchId: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      translations,
    };
  });
}

describe("exportToXLIFF", () => {
  it("should export valid XLIFF 2.0 with source and target", () => {
    const translations = buildProjectTranslationsWithSource(
      { "home.title": "Accueil", "home.subtitle": "Bienvenue" },
      "fr",
      { "home.title": "Home", "home.subtitle": "Welcome" },
      "en",
    );

    const result = exportToXLIFF(translations, "en", "fr", "my-project");

    expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="my-project">
    <unit id="home.title">
      <segment>
        <source>Home</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="home.subtitle">
      <segment>
        <source>Welcome</source>
        <target>Bienvenue</target>
      </segment>
    </unit>
  </file>
</xliff>`);
  });

  it("should escape XML entities in keys and values", () => {
    const translations = buildProjectTranslationsWithSource(
      { "key.with.&special": 'Value with <html> & "quotes"' },
      "fr",
      { "key.with.&special": "Source" },
      "en",
    );

    const result = exportToXLIFF(translations, "en", "fr", "test");

    expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="key.with.&amp;special">
      <segment>
        <source>Source</source>
        <target>Value with &lt;html&gt; &amp; &quot;quotes&quot;</target>
      </segment>
    </unit>
  </file>
</xliff>`);
  });

  it("should include key descriptions as XLIFF notes", () => {
    const translations = buildProjectTranslationsWithSource(
      { greeting: "Bonjour" },
      "fr",
      { greeting: "Hello" },
      "en",
      { greeting: "Used on the homepage" },
    );

    const result = exportToXLIFF(translations, "en", "fr", "test");

    expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="greeting">
      <notes>
        <note>Used on the homepage</note>
      </notes>
      <segment>
        <source>Hello</source>
        <target>Bonjour</target>
      </segment>
    </unit>
  </file>
</xliff>`);
  });

  it("should not include notes when description is null", () => {
    const translations = buildProjectTranslationsWithSource(
      { greeting: "Bonjour" },
      "fr",
      { greeting: "Hello" },
      "en",
    );

    const result = exportToXLIFF(translations, "en", "fr", "test");

    expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="greeting">
      <segment>
        <source>Hello</source>
        <target>Bonjour</target>
      </segment>
    </unit>
  </file>
</xliff>`);
  });

  it("should use empty <source> when source translation is missing", () => {
    const translations: ProjectTranslations = [
      {
        id: 1,
        projectId: 1,
        keyName: "key",
        description: null,
        branchId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        translations: [
          {
            id: 1,
            keyId: 1,
            locale: "fr",
            value: "Valeur",
            isFuzzy: false,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          },
        ],
      },
    ];

    const result = exportToXLIFF(translations, "en", "fr", "test");

    expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="key">
      <segment>
        <source></source>
        <target>Valeur</target>
      </segment>
    </unit>
  </file>
</xliff>`);
  });

  it("should omit <target> when target translation is missing", () => {
    const translations: ProjectTranslations = [
      {
        id: 1,
        projectId: 1,
        keyName: "key",
        description: null,
        branchId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        translations: [
          {
            id: 1,
            keyId: 1,
            locale: "en",
            value: "Value",
            isFuzzy: false,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          },
        ],
      },
    ];

    const result = exportToXLIFF(translations, "en", "fr", "test");

    expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="key">
      <segment>
        <source>Value</source>
      </segment>
    </unit>
  </file>
</xliff>`);
  });

  it("should skip keys with neither source nor target", () => {
    const translations: ProjectTranslations = [
      {
        id: 1,
        projectId: 1,
        keyName: "key-with-translations",
        description: null,
        branchId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        translations: [
          {
            id: 1,
            keyId: 1,
            locale: "en",
            value: "Value",
            isFuzzy: false,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          },
        ],
      },
      {
        id: 2,
        projectId: 1,
        keyName: "key-only-other-locale",
        description: null,
        branchId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        translations: [
          {
            id: 2,
            keyId: 2,
            locale: "de",
            value: "Wert",
            isFuzzy: false,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          },
        ],
      },
    ];

    const result = exportToXLIFF(translations, "en", "fr", "test");

    expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="key-with-translations">
      <segment>
        <source>Value</source>
      </segment>
    </unit>
  </file>
</xliff>`);
  });

  it("should handle empty translations list", () => {
    const result = exportToXLIFF([], "en", "fr", "test");

    expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
  </file>
</xliff>`);
  });

  it("should escape XML entities in project name", () => {
    const translations = buildProjectTranslationsWithSource(
      { key: "value" },
      "fr",
      { key: "source" },
      "en",
    );

    const result = exportToXLIFF(
      translations,
      "en",
      "fr",
      'Project "Special" & <test>',
    );

    expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="Project &quot;Special&quot; &amp; &lt;test&gt;">
    <unit id="key">
      <segment>
        <source>source</source>
        <target>value</target>
      </segment>
    </unit>
  </file>
</xliff>`);
  });
});
