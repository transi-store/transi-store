export const TranslationKeysSort = {
  ALPHABETICAL: "alphabetical",
  CREATED_AT: "createdAt",
  RELEVANCE: "relevance",
} as const;

export type TranslationKeysSort =
  (typeof TranslationKeysSort)[keyof typeof TranslationKeysSort];
