import { describe, it, expect } from "vitest";
import { parseImportXLIFF } from "./xliff.server";

describe("parseImportXLIFF", () => {
  it("should parse a valid XLIFF 2.0 file with target translations", () => {
    const xliff = `<?xml version="1.0" encoding="UTF-8"?>
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
</xliff>`;

    const result = parseImportXLIFF(xliff);

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
    <unit id="home.title">
      <segment>
        <source>Home</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="home.untranslated">
      <segment>
        <source>Not yet translated</source>
      </segment>
    </unit>
  </file>
</xliff>`;

    const result = parseImportXLIFF(xliff);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      "home.title": "Accueil",
    });
  });

  it("should unescape XML entities in keys and values", () => {
    const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="key.with.&amp;special">
      <segment>
        <source>Source</source>
        <target>Value with &lt;html&gt; &amp; &quot;quotes&quot;</target>
      </segment>
    </unit>
  </file>
</xliff>`;

    const result = parseImportXLIFF(xliff);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      "key.with.&special": 'Value with <html> & "quotes"',
    });
  });

  it("should handle units with notes", () => {
    const xliff = `<?xml version="1.0" encoding="UTF-8"?>
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
</xliff>`;

    const result = parseImportXLIFF(xliff);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ greeting: "Bonjour" });
  });

  it("should return error when no target translations are found", () => {
    const xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="home.title">
      <segment>
        <source>Home</source>
      </segment>
    </unit>
  </file>
</xliff>`;

    const result = parseImportXLIFF(xliff);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Aucune traduction cible");
  });

  it("should return error for empty content", () => {
    const result = parseImportXLIFF("");

    expect(result.success).toBe(false);
  });

  it("should return error when file is too large", () => {
    const largeContent = "x".repeat(6 * 1024 * 1024);
    const result = parseImportXLIFF(largeContent);

    expect(result.success).toBe(false);
    expect(result.error).toContain("trop volumineux");
  });
});
