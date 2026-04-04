import { describe, it, expect } from "vitest";
import { PhpTranslationFormat } from "./php-format.server";
import { buildProjectTranslations } from "./test-helpers";

describe("PhpTranslationFormat", () => {
  const format = new PhpTranslationFormat();

  describe("parseImport", () => {
    it("should parse a valid PHP translation file with single quotes", () => {
      const php = `<?php

return [
    'home.title' => 'Accueil',
    'nav.about' => 'À propos',
];`;

      const result = format.parseImport(php);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "nav.about": "À propos",
      });
    });

    it("should parse PHP file with double quotes", () => {
      const php = `<?php

return [
    "home.title" => "Accueil",
    "nav.about" => "À propos",
];`;

      const result = format.parseImport(php);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "nav.about": "À propos",
      });
    });

    it("should handle escaped single quotes in values", () => {
      const php = `<?php

return [
    'greeting' => 'It\\'s a test',
];`;

      const result = format.parseImport(php);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        greeting: "It's a test",
      });
    });

    it("should return error for empty content", () => {
      const result = format.parseImport("");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No translations found");
    });

    it("should handle large content without translations", () => {
      const largeContent = "x".repeat(6 * 1024 * 1024);
      const result = format.parseImport(largeContent);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No translations found");
    });

    it("should handle mixed quote styles", () => {
      const php = `<?php

return [
    'home.title' => "Accueil",
    "nav.about" => 'À propos',
];`;

      const result = format.parseImport(php);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        "home.title": "Accueil",
        "nav.about": "À propos",
      });
    });
  });

  describe("exportSingleLocale", () => {
    it("should export translations as PHP array", () => {
      const translations = buildProjectTranslations(
        { "home.title": "Accueil", "nav.about": "À propos" },
        "fr",
      );

      const result = format.exportSingleLocale(translations, { locale: "fr" });

      expect(result).toBe(`<?php

return [
    'home.title' => 'Accueil',
    'nav.about' => 'À propos',
];`);
    });

    it("should escape single quotes in keys and values", () => {
      const translations = buildProjectTranslations(
        { greeting: "It's a test" },
        "en",
      );

      const result = format.exportSingleLocale(translations, { locale: "en" });

      expect(result).toContain("'It\\'s a test'");
    });

    it("should handle empty translations list", () => {
      const result = format.exportSingleLocale([], { locale: "fr" });

      expect(result).toBe("<?php\n\nreturn [\n];");
    });
  });

  describe("handleExportRequest", () => {
    const translations = buildProjectTranslations(
      { "home.title": "Accueil" },
      "fr",
    );

    it("should return PHP content with correct content-type", () => {
      const result = format.handleExportRequest({
        locale: "fr",
        projectTranslations: translations,
        projectName: "My Project",
      });

      expect(result.contentType).toBe("text/x-php");
      expect(result.fileExtension).toBe("php");
    });
  });
});
