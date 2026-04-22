import { describe, it, expect } from "vitest";
import { XliffTranslationFormat } from "./xliff-format.server";
import { buildProjectTranslations } from "./test-helpers";

describe("XliffTranslationFormat", () => {
  const format = new XliffTranslationFormat();

  describe("parseImport", () => {
    it("should parse a valid XLIFF 2.0 file with target translations", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="my-project">
    <unit id="home.title" name="home.title">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="home.subtitle" name="home.subtitle">
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
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="my-project">
    <unit id="home.title" name="home.title">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="home.untranslated" name="home.untranslated">
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
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="key.with._special" name="key.with.&amp;special">
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
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="greeting" name="greeting">
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

    it("should parse keys with spaces using the name attribute", () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="my-project">
    <unit id="Access_Denied." name="Access Denied.">
      <segment>
        <source>Access Denied.</source>
        <target>Accès refusé.</target>
      </segment>
    </unit>
  </file>
</xliff>`;

      const result = format.parseImport(xliff);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "Access Denied.": "Accès refusé.",
      });
    });

    it("should fall back to id attribute when name is absent (backward compatibility)", () => {
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
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="home.title" name="home.title">
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

    it('should use "source" if name is not defined', () => {
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="my-project">
    <unit id="1">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="2">
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
  });

  describe("exportSingleLocale", () => {
    it("should export valid XLIFF 2.0 with DB ids and key names", () => {
      const translations = buildProjectTranslations(
        { "home.title": "Accueil", "home.subtitle": "Bienvenue" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        fileId: 7,
        filePath: "locales/<lang>/common.xlf",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="7" original="locales/fr/common.xlf">
    <unit id="1" name="home.title">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="2" name="home.subtitle">
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
        fileId: 1,
        filePath: "translations/<lang>.xlf",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="1" original="translations/fr.xlf">
    <unit id="1" name="key.with.&amp;special">
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
        fileId: 1,
        filePath: "translations/<lang>.xlf",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="1" original="translations/fr.xlf">
    <unit id="1" name="greeting">
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
        fileId: 1,
        filePath: "translations/<lang>.xlf",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="1" original="translations/fr.xlf">
    <unit id="1" name="greeting">
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
        fileId: 1,
        filePath: "translations/<lang>.xlf",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="1" original="translations/fr.xlf">
    <unit id="1" name="key">
      <segment>
        <source>key</source>
      </segment>
    </unit>
  </file>
</xliff>`);
    });

    it("should handle keys with spaces: DB id is valid NMTOKEN, key in name attribute", () => {
      const translations = buildProjectTranslations(
        { "Access Denied.": "Accès refusé." },
        "fr",
      );

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        fileId: 1,
        filePath: "translations/<lang>.xlf",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="1" original="translations/fr.xlf">
    <unit id="1" name="Access Denied.">
      <segment>
        <source>Access Denied.</source>
        <target>Accès refusé.</target>
      </segment>
    </unit>
  </file>
</xliff>`);
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], {
        locale: "fr",
        fileId: 1,
        filePath: "translations/<lang>.xlf",
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
</xliff>`);
    });

    it("should escape special characters in filePath into the original attribute", () => {
      const translations = buildProjectTranslations({ key: "value" }, "fr");

      const result = format.exportSingleLocale(translations, {
        locale: "fr",
        fileId: 42,
        filePath: 'Project "Special" & <test>',
      });

      expect(result).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="42" original="Project &quot;Special&quot; &amp; &lt;test&gt;">
    <unit id="1" name="key">
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

    it("should return XLIFF content with correct content-type", () => {
      const result = format.handleExportRequest({
        locale: "fr",
        projectTranslations: translations,
        fileId: 5,
        filePath: "locales/<lang>/common.xlf",
      });

      expect(result.contentType).toBe("application/x-xliff+xml");
      expect(result.fileExtension).toBe("xliff");
      expect(result.content).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="5" original="locales/fr/common.xlf">
    <unit id="1" name="home.title">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
  </file>
</xliff>`);
    });
  });
});
