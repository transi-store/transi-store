import { eq, sql, and, or, inArray, desc, isNull } from "drizzle-orm";
import { db, schema } from "./db.server";
import { TranslationKeysSort } from "./sort/keySort";

/**
 * Seuil de similarité minimum pour la recherche floue (0-1)
 * Utilisé pour filtrer les résultats de recherche basés sur le score de similarité
 */
const SIMILARITY_THRESHOLD = 0.7;

/**
 * Fonction de calcul de similarité maximale pour la recherche floue
 * Combine les fonctions PostgreSQL similarity() et word_similarity()
 * pour obtenir le meilleur score de correspondance
 *
 * @param field - Le champ de la base de données à comparer
 * @param query - La requête de recherche de l'utilisateur
 * @returns Expression SQL calculant le score de similarité maximal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle column type is complex
function maxSimilarity(field: any, query: string) {
  return sql<number>`GREATEST(
    similarity(${field}, ${query}),
    word_similarity(${query}, ${field})
  )`;
}

type SearchTranslationKeyResult = {
  key: typeof schema.translationKeys.$inferSelect;
  matchType: "key" | "translation";
  similarity: number;
  translationLocale?: string;
  translationValue?: string;
};

// Recherche universelle sur les clés et traductions, filtrable par projectIds
export async function searchTranslationKeys(
  searchQuery: string,
  projectIds: Array<number>,
  options?: {
    limit?: number;
    offset?: number;
    locale?: string;
    sort?: TranslationKeysSort;
    branchId?: number;
    branchOnly?: boolean;
    fileId?: number | null;
  },
): Promise<Array<SearchTranslationKeyResult>> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const sort = options?.sort ?? TranslationKeysSort.RELEVANCE;
  const orderBy =
    sort === TranslationKeysSort.CREATED_AT
      ? desc(schema.translationKeys.createdAt)
      : sort === TranslationKeysSort.ALPHABETICAL
        ? schema.translationKeys.keyName
        : desc(sql`similarity`);

  // Branch filter
  let branchCondition;
  if (options?.branchId !== undefined) {
    if (options?.branchOnly) {
      branchCondition = eq(schema.translationKeys.branchId, options.branchId);
    } else {
      branchCondition = or(
        isNull(schema.translationKeys.branchId),
        eq(schema.translationKeys.branchId, options.branchId),
      )!;
    }
  } else {
    branchCondition = isNull(schema.translationKeys.branchId);
  }

  // Exclude soft-deleted keys
  const notDeleted = isNull(schema.translationKeys.deletedAt);

  // TODO: remove this fileCondition fallback once all keys have been migrated to a file
  const fileCondition =
    options?.fileId !== undefined
      ? options.fileId === null
        ? isNull(schema.translationKeys.fileId)
        : eq(schema.translationKeys.fileId, options.fileId)
      : undefined;

  // Matches sur keyName et description
  const keyResults = await db
    .select({
      key: schema.translationKeys,
      similarity: maxSimilarity(schema.translationKeys.keyName, searchQuery).as(
        "similarity",
      ),
      matchType: sql<"key">`'key'`.as("matchType"),
    })
    .from(schema.translationKeys)
    .where(
      and(
        inArray(schema.translationKeys.projectId, projectIds),
        branchCondition,
        notDeleted,
        fileCondition,
        or(
          sql`${maxSimilarity(schema.translationKeys.keyName, searchQuery)} > ${SIMILARITY_THRESHOLD}`,
          sql`${maxSimilarity(schema.translationKeys.description, searchQuery)} > ${SIMILARITY_THRESHOLD}`,
        )!,
      ),
    )
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Matches sur les traductions
  const translationWhere = [
    inArray(schema.translationKeys.projectId, projectIds),
    branchCondition,
    notDeleted,
    fileCondition,
    sql`${maxSimilarity(schema.translations.value, searchQuery)} > ${SIMILARITY_THRESHOLD}`,
  ];
  if (options?.locale) {
    translationWhere.push(eq(schema.translations.locale, options.locale));
  }
  const translationResults = await db
    .select({
      key: schema.translationKeys,
      similarity: maxSimilarity(schema.translations.value, searchQuery).as(
        "similarity",
      ),
      matchType: sql<"translation">`'translation'`.as("matchType"),
      translationLocale: schema.translations.locale,
      translationValue: schema.translations.value,
    })
    .from(schema.translationKeys)
    .innerJoin(
      schema.translations,
      eq(schema.translationKeys.id, schema.translations.keyId),
    )
    .where(and(...translationWhere))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Fusionne et déduplique (priorité clé)
  const all = [...keyResults, ...translationResults];
  const seen = new Map();
  const deduped = [];
  for (const row of all) {
    const id = row.key.id;
    if (!seen.has(id) || row.matchType === "key") {
      seen.set(id, true);
      deduped.push(row);
    }
  }

  return deduped;
}
