import type { getProjectTranslations } from "../translation-keys.server";

type ProjectTranslations = Awaited<ReturnType<typeof getProjectTranslations>>;

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function exportToXLIFF(
  projectTranslations: ProjectTranslations,
  sourceLocale: string,
  targetLocale: string,
  projectName: string,
): string {
  const xml: Array<string> = [];

  xml.push('<?xml version="1.0" encoding="UTF-8"?>');
  xml.push(
    '<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="' +
      escapeXml(sourceLocale) +
      '" trgLang="' +
      escapeXml(targetLocale) +
      '">',
  );
  xml.push('  <file id="' + escapeXml(projectName) + '">');

  for (const key of projectTranslations) {
    const sourceTranslation = key.translations.find(
      (t) => t.locale === sourceLocale,
    );
    const targetTranslation = key.translations.find(
      (t) => t.locale === targetLocale,
    );

    if (sourceTranslation || targetTranslation) {
      xml.push('    <unit id="' + escapeXml(key.keyName) + '">');

      if (key.description) {
        xml.push("      <notes>");
        xml.push("        <note>" + escapeXml(key.description) + "</note>");
        xml.push("      </notes>");
      }

      xml.push("      <segment>");

      if (sourceTranslation) {
        xml.push(
          "        <source>" + escapeXml(sourceTranslation.value) + "</source>",
        );
      } else {
        xml.push("        <source></source>");
      }

      if (targetTranslation) {
        xml.push(
          "        <target>" + escapeXml(targetTranslation.value) + "</target>",
        );
      }

      xml.push("      </segment>");
      xml.push("    </unit>");
    }
  }

  xml.push("  </file>");
  xml.push("</xliff>");

  return xml.join("\n");
}
