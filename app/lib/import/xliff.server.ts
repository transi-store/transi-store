type ParseResult = {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Parse XLIFF 2.0 file content and extract target translations as flat key-value pairs.
 * Uses the "id" attribute of <unit> elements as keys and the <target> text as values.
 */
export function parseImportXLIFF(fileContent: string): ParseResult {
  if (fileContent.length > MAX_FILE_SIZE) {
    return {
      success: false,
      error: "Le fichier est trop volumineux (maximum 5 MB)",
    };
  }

  try {
    const data: Record<string, string> = {};

    // Extract all <unit> elements
    const unitRegex = /<unit\s[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/unit>/g;
    let unitMatch;

    while ((unitMatch = unitRegex.exec(fileContent)) !== null) {
      const keyName = unescapeXml(unitMatch[1]);
      const unitContent = unitMatch[2];

      // Extract <target> value from the unit's <segment>
      const targetMatch = /<target>([\s\S]*?)<\/target>/.exec(unitContent);

      if (targetMatch) {
        data[keyName] = unescapeXml(targetMatch[1]);
      }
    }

    if (Object.keys(data).length === 0) {
      return {
        success: false,
        error:
          "Aucune traduction cible trouvée dans le fichier XLIFF (pas de balises <target>)",
      };
    }

    return { success: true, data };
  } catch (_error) {
    return {
      success: false,
      error: "Format XLIFF invalide",
    };
  }
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
