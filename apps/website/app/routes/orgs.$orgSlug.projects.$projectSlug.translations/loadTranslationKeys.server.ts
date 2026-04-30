import { getTranslationKeys } from "~/lib/translation-keys.server";
import { TranslationKeysSort } from "~/lib/sort/keySort";
import { TRANSLATIONS_LIMIT } from "./constants";
import type { ProjectFile } from "../../../drizzle/schema";
import { DocumentMode } from "./constants";

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

export type TranslationKeysLoaderData = {
  mode: DocumentMode.TranslationKeys;
  projectFiles: ProjectFile[];
  selectedFileId: number;
  keys: Awaited<ReturnType<typeof getTranslationKeys>>;
  search: string | undefined;
  highlight: string | undefined;
  page: number;
  sort: TranslationKeysSort;
};

export async function translationKeysLoader(args: {
  projectId: number;
  projectFiles: ProjectFile[];
  selectedFileId: number;
  search: string | undefined;
  highlight: string | undefined;
  page: number;
  sort: TranslationKeysSort;
}): Promise<TranslationKeysLoaderData> {
  const {
    projectId,
    projectFiles,
    selectedFileId,
    search,
    highlight,
    page,
    sort,
  } = args;
  const offset = (page - 1) * TRANSLATIONS_LIMIT;

  const keys = await getTranslationKeys(projectId, {
    search,
    limit: TRANSLATIONS_LIMIT,
    offset,
    sort,
    fileId: selectedFileId,
  });

  return {
    mode: DocumentMode.TranslationKeys,
    projectFiles,
    selectedFileId,
    keys,
    search,
    highlight,
    page,
    sort,
  };
}
