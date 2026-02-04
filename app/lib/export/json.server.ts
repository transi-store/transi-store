import type { getProjectTranslations } from "../translation-keys.server";

type ProjectTranslations = Awaited<ReturnType<typeof getProjectTranslations>>;

export function exportToJSON(
  projectTranslations: ProjectTranslations,
  locale: string,
): string {
  const result: Record<string, string> = {};

  // projectTranslations is already sorted alphabetically by keyName in SQL
  for (const key of projectTranslations) {
    const translation = key.translations.find((t) => t.locale === locale);

    if (translation) {
      result[key.keyName] = translation.value;
    }
  }

  return JSON.stringify(result, null, 2);
}

export function exportAllLanguagesToJSON(
  projectTranslations: ProjectTranslations,
  locales: Array<string>,
): string {
  const result: Record<string, Record<string, string>> = {};

  for (const locale of locales) {
    result[locale] = {};

    for (const key of projectTranslations) {
      const translation = key.translations.find((t) => t.locale === locale);

      if (translation) {
        result[locale][key.keyName] = translation.value;
      }
    }
  }

  return JSON.stringify(result, null, 2);
}
