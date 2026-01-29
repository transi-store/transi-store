import type { schema } from "./db.server";

export type RegularDataRow = typeof schema.translationKeys.$inferSelect & {
  translatedLocales: Array<string>;
  defaultTranslation: string | null;
};

export type SearchDataRow = RegularDataRow & {
  matchType: "key" | "translation";
  translationLocale: string | undefined;
  translationValue: string | undefined;
};

export function isSearchTranlation(
  row: RegularDataRow | SearchDataRow,
): row is SearchDataRow {
  return "matchType" in row && typeof row.matchType === "string";
}
