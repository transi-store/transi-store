import { describe, it, expect } from "vitest";
import { XliffTranslationFormat } from "./xliff-format.server";
import { buildProjectTranslations } from "./test-helpers";

describe("XliffTranslationFormat", () => {
  const format = new XliffTranslationFormat();

  describe("parseImport", () => {
    it("should parse a valid XLIFF 2.0 file with target translations", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="my-project">
    <unit id="home.title">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="home.subtitle">
      <segment>
        <source>home.subtitle</source>
        <target>Bienvenue</target>
      </segment>
    </unit>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "home.subtitle": "Bienvenue",
      });
    });

    it("should skip units without a <target> element", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="my-project">
    <unit id="home.title">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="home.untranslated">
      <segment>
        <source>home.untranslated</source>
      </segment>
    </unit>
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
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="test">
    <unit id="key.with.&amp;special">
      <segment>
        <source>key.with.&amp;special</source>
        <target>Value with &lt;html&gt; &amp; &quot;quotes&quot;</target>
      </segment>
    </unit>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "key.with.&special": 'Value with <html> & "quotes"',
      });
    });

    it("should handle units with notes", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="test">
    <unit id="greeting">
      <notes>
        <note>Used on the homepage</note>
      </notes>
      <segment>
        <source>greeting</source>
        <target>Bonjour</target>
      </segment>
    </unit>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ greeting: "Bonjour" });
    });

    it("should return error when no target translations are found", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="test">
    <unit id="home.title">
      <segment>
        <source>home.title</source>
      </segment>
    </unit>
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
    it("should export valid XLIFF 2.0 with key as source", () => {
      const translations = buildProjectTranslations(
        { "home.title": "Accueil", "home.subtitle": "Bienvenue" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        projectName: "my-project",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="my-project">
    <unit id="home.title">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="home.subtitle">
      <segment>
        <source>home.subtitle</source>
        <target>Bienvenue</target>
      </segment>
    </unit>
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
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="test">
    <unit id="key.with.&amp;special">
      <segment>
        <source>key.with.&amp;special</source>
        <target>Value with &lt;html&gt; &amp; &quot;quotes&quot;</target>
      </segment>
    </unit>
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
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="test">
    <unit id="greeting">
      <notes>
        <note>Used on the homepage</note>
      </notes>
      <segment>
        <source>greeting</source>
        <target>Bonjour</target>
      </segment>
    </unit>
  </file>
</xliff>`);
    });

    it("should not include notes when description is null", () => {
      const translations = buildProjectTranslations(
        { greeting: "Bonjour" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        projectName: "test",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="test">
    <unit id="greeting">
      <segment>
        <source>greeting</source>
        <target>Bonjour</target>
      </segment>
    </unit>
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
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="test">
    <unit id="key">
      <segment>
        <source>key</source>
      </segment>
    </unit>
  </file>
</xliff>`);
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], {
        locale: "fr",
        projectName: "test",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="test">
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
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="Project &quot;Special&quot; &amp; &lt;test&gt;">
    <unit id="key">
      <segment>
        <source>key</source>
        <target>value</target>
      </segment>
    </unit>
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
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" trgLang="fr">
  <file id="My Project">
    <unit id="home.title">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
  </file>
</xliff>`);
      }
    });
  });
});
