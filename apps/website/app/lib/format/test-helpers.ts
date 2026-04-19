import type { ProjectTranslations } from "./types";

export function buildProjectTranslations(
  data: Record<string, string>,
  locale: string,
  descriptions?: Record<string, string>,
): ProjectTranslations {
  return Object.entries(data).map(
    ([keyName, value], index): ProjectTranslations[number] => ({
      id: index + 1,
      projectId: 1,
      fileId: 1,
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
    }),
  );
}
