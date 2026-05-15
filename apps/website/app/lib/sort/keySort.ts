export const TranslationKeysSort = {
  ALPHABETICAL: "alphabetical",
  CREATED_AT: "createdAt",
  RELEVANCE: "relevance",
} as const;

export type TranslationKeysSort =
  (typeof TranslationKeysSort)[keyof typeof TranslationKeysSort];

export const TranslationFilter = {
  ALL: "all",
  MISSING: "missing",
  FUZZY: "fuzzy",
} as const;

export type TranslationFilter =
  (typeof TranslationFilter)[keyof typeof TranslationFilter];

export function resolveFilter(filter: string | null): TranslationFilter {
  if (filter === TranslationFilter.MISSING) return TranslationFilter.MISSING;
  if (filter === TranslationFilter.FUZZY) return TranslationFilter.FUZZY;
  return TranslationFilter.ALL;
}
