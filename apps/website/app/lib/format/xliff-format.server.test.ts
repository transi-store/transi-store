import { describe, it, expect } from "vitest";
import { XliffTranslationFormat } from "./xliff-format.server";
import type { ProjectTranslations } from "./types";

function buildProjectTranslations(
  data: Record<string, string>,
  locale: string,
  descriptions?: Record<string, string>,
): ProjectTranslations {
  return Object.entries(data).map(([keyName, value], index) => ({
    id: index + 1,
    projectId: 1,
    keyName,
    description: descriptions?.[keyName] ?? null,
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

describe("XliffTranslationFormat", () => {
  const format = new XliffTranslationFormat();

  describe("parseImport", () => {
    it("should parse a valid XLIFF 1.2 file with target translations", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="my-project" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="home.title" resname="home.title">
        <source>home.title</source>
        <target>Accueil</target>
      </trans-unit>
      <trans-unit id="home.subtitle" resname="home.subtitle">
        <source>home.subtitle</source>
        <target>Bienvenue</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "home.subtitle": "Bienvenue",
      });
    });

    it("should skip trans-units without a <target> element", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="my-project" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="home.title" resname="home.title">
        <source>home.title</source>
        <target>Accueil</target>
      </trans-unit>
      <trans-unit id="home.untranslated" resname="home.untranslated">
        <source>home.untranslated</source>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
      });
    });

    it("should unescape XML entities in keys and values", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="key.with.&amp;special" resname="key.with.&amp;special">
        <source>key.with.&amp;special</source>
        <target>Value with &lt;html&gt; &amp; &quot;quotes&quot;</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "key.with.&special": 'Value with <html> & "quotes"',
      });
    });

    it("should handle trans-units with notes", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="greeting" resname="greeting">
        <source>greeting</source>
        <target>Bonjour</target>
        <note>Used on the homepage</note>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ greeting: "Bonjour" });
    });

    it("should parse XLIFF 1.2 using resname when both id and resname are present", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="1" resname="home.title">
        <source>home.title</source>
        <target>Accueil</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ "home.title": "Accueil" });
    });

    it("should parse XLIFF 2.0 for backward compatibility", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="my-project">
    <unit id="home.title">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ "home.title": "Accueil" });
    });

    it("should return error when no target translations are found", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="home.title" resname="home.title">
        <source>home.title</source>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Aucune traduction cible");
    });

    it("should return error for empty content", () => {
      const result = format.parseImport("");

      expect(result.success).toBe(false);
    });

    it("should return error when file is too large", () => {
      const largeContent = "x".repeat(6 * 1024 * 1024);
      const result = format.parseImport(largeContent);

      expect(result.success).toBe(false);
      expect(result.error).toContain("trop volumineux");
    });
  });

  describe("exportSingleLocale", () => {
    it("should export valid XLIFF 1.2 with key as source and resname", () => {
      const translations = buildProjectTranslations(
        { "home.title": "Accueil", "home.subtitle": "Bienvenue" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        projectName: "my-project",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="my-project" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="home.title" resname="home.title">
        <source>home.title</source>
        <target>Accueil</target>
      </trans-unit>
      <trans-unit id="home.subtitle" resname="home.subtitle">
        <source>home.subtitle</source>
        <target>Bienvenue</target>
      </trans-unit>
    </body>
  </file>
</xliff>`);
    });

    it("should escape XML entities in keys and values", () => {
      const translations = buildProjectTranslations(
        { "key.with.&special": 'Value with <html> & "quotes"' },
        "fr",
      );

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        projectName: "test",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="key.with.&amp;special" resname="key.with.&amp;special">
        <source>key.with.&amp;special</source>
        <target>Value with &lt;html&gt; &amp; &quot;quotes&quot;</target>
      </trans-unit>
    </body>
  </file>
</xliff>`);
    });

    it("should include key descriptions as XLIFF notes", () => {
      const translations = buildProjectTranslations(
        { greeting: "Bonjour" },
        "fr",
        { greeting: "Used on the homepage" },
      );

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        projectName: "test",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="greeting" resname="greeting">
        <source>greeting</source>
        <target>Bonjour</target>
        <note>Used on the homepage</note>
      </trans-unit>
    </body>
  </file>
</xliff>`);
    });

    it("should not include note when description is null", () => {
      const translations = buildProjectTranslations(
        { greeting: "Bonjour" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        projectName: "test",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="greeting" resname="greeting">
        <source>greeting</source>
        <target>Bonjour</target>
      </trans-unit>
    </body>
  </file>
</xliff>`);
    });

    it("should omit <target> when translation is missing for locale", () => {
      const translations = buildProjectTranslations({ key: "Value" }, "en");

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        projectName: "test",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="key" resname="key">
        <source>key</source>
      </trans-unit>
    </body>
  </file>
</xliff>`);
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], {
        locale: "fr",
        projectName: "test",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="test" source-language="en" target-language="fr" datatype="plaintext">
    <body>
    </body>
  </file>
</xliff>`);
    });

    it("should escape XML entities in project name", () => {
      const translations = buildProjectTranslations({ key: "value" }, "fr");

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        projectName: 'Project "Special" & <test>',
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="Project &quot;Special&quot; &amp; &lt;test&gt;" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="key" resname="key">
        <source>key</source>
        <target>value</target>
      </trans-unit>
    </body>
  </file>
</xliff>`);
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
        expect(result.error).toBe(
          "Missing 'locale' parameter. Use ?format=xliff&locale=fr",
        );
      }
    });

    it("should return error when locale not in project", () => {
      const result = format.handleExportRequest({
        searchParams: new URLSearchParams("locale=de"),
        projectTranslations: translations,
        projectName: "My Project",
        availableLocales: ["en", "fr"],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Language 'de' not found in this project");
      }
    });

    it("should return XLIFF content with correct content-type", () => {
      const result = format.handleExportRequest({
        searchParams: new URLSearchParams("locale=fr"),
        projectTranslations: translations,
        projectName: "My Project",
        availableLocales: ["en", "fr"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.contentType).toBe("application/x-xliff+xml");
        expect(result.fileExtension).toBe("xliff");
        expect(result.content).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file original="My Project" source-language="en" target-language="fr" datatype="plaintext">
    <body>
      <trans-unit id="home.title" resname="home.title">
        <source>home.title</source>
        <target>Accueil</target>
      </trans-unit>
    </body>
  </file>
</xliff>`);
      }
    });
  });
});
