import { TranslationKeysSort } from "~/lib/sort/keySort";

export function resolveSort(
  sortParam: string | null,
  hasSearch: boolean,
): TranslationKeysSort {
  const sort = Object.values(TranslationKeysSort).includes(
    sortParam as TranslationKeysSort,
  )
    ? (sortParam as TranslationKeysSort)
    : undefined;
  if (!hasSearch && sort === TranslationKeysSort.RELEVANCE) {
    return TranslationKeysSort.ALPHABETICAL;
  }
  return (
    sort ??
    (hasSearch
      ? TranslationKeysSort.RELEVANCE
      : TranslationKeysSort.ALPHABETICAL)
  );
}
