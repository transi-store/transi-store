import type {
  TranslationFormat,
  ParseResult,
  ExportOptions,
  ProjectTranslations,
} from "./types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export class JsonTranslationFormat implements TranslationFormat {
  parseImport(fileContent: string): ParseResult {
    if (fileContent.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Le fichier est trop volumineux (maximum 5 MB)",
      };
    }

    try {
      const parsed = JSON.parse(fileContent);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return {
          success: false,
          error:
            "Le fichier doit contenir un objet JSON avec des paires clé/valeur",
        };
      }

      return {
        success: true,
        data: parsed as Record<string, string>,
      };
    } catch (_error) {
      return {
        success: false,
        error: "Format JSON invalide",
      };
    }
  }

  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string {
    const result: Record<string, string> = {};

    for (const key of projectTranslations) {
      const translation = key.translations.find(
        (t) => t.locale === options.locale,
      );

      if (translation) {
        result[key.keyName] = translation.value;
      }
    }

    return JSON.stringify(result, null, 2);
  }

  exportAllLocales(
    projectTranslations: ProjectTranslations,
    locales: Array<string>,
  ): string {
    const result: Record<string, Record<string, string>> = {};

    for (const locale of locales) {
      result[locale] = {};

      for (const key of projectTranslations) {
        const translation = key.translations.find(
          (t) => t.locale === locale,
        );

        if (translation) {
          result[locale][key.keyName] = translation.value;
        }
      }
    }

    return JSON.stringify(result, null, 2);
  }
}
