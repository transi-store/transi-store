type SearchTranslationKeyResult = {
  key: typeof schema.translationKeys.$inferSelect;
  translationLocale?: string;
  translationValue?: string;
  matchType: "key" | "translation";
};

// Recherche universelle sur les clés et traductions, filtrable par projectIds
export async function searchTranslationKeys(
  searchQuery: string,
  projectIds: number[],
  options?: {
    limit?: number;
    offset?: number;
    locale?: string;
  },
): Promise<Array<SearchTranslationKeyResult>> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  // Matches sur keyName et description
  const keyResults = await db
    .select({
      key: schema.translationKeys,
      similarity: maxSimilarity(schema.translationKeys.keyName, searchQuery).as(
        "similarity",
      ),
      matchType: sql`'key'`.as("matchType"),
    })
    .from(schema.translationKeys)
    .where(
      and(
        inArray(schema.translationKeys.projectId, projectIds),
        or(
          sql`${maxSimilarity(schema.translationKeys.keyName, searchQuery)} > ${SIMILARITY_THRESHOLD}`,
          sql`${maxSimilarity(schema.translationKeys.description, searchQuery)} > ${SIMILARITY_THRESHOLD}`,
        )!,
      ),
    )
    .orderBy(desc(sql`similarity`))
    .limit(limit)
    .offset(offset);

  // Matches sur les traductions
  const translationWhere = [
    inArray(schema.translationKeys.projectId, projectIds),
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
      matchType: sql`'translation'`.as("matchType"),
      translationLocale: schema.translations.locale,
      translationValue: schema.translations.value,
    })
    .from(schema.translationKeys)
    .innerJoin(
      schema.translations,
      eq(schema.translationKeys.id, schema.translations.keyId),
    )
    .where(and(...translationWhere))
    .orderBy(desc(sql`similarity`))
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
import { eq, sql, and, or, inArray, desc } from "drizzle-orm";
import { db, schema } from "./db.server";

/**
 * Seuil de similarité minimum pour la recherche floue (0-1)
 * Utilisé pour filtrer les résultats de recherche basés sur le score de similarité
 */
export const SIMILARITY_THRESHOLD = 0.7;

/**
 * Fonction de calcul de similarité maximale pour la recherche floue
 * Combine les fonctions PostgreSQL similarity() et word_similarity()
 * pour obtenir le meilleur score de correspondance
 *
 * @param field - Le champ de la base de données à comparer
 * @param query - La requête de recherche de l'utilisateur
 * @returns Expression SQL calculant le score de similarité maximal
 */
export function maxSimilarity(field: any, query: string) {
  return sql<number>`GREATEST(
    similarity(${field}, ${query}),
    word_similarity(${query}, ${field})
  )`;
}

/**
 * Recherche floue dans les clés de traduction
 * Utilise la similarité trigram PostgreSQL pour trouver les clés correspondantes
 *
 * @param searchQuery - La requête de recherche (déjà trimmed)
 * @param projectIds - ID(s) de projet(s) dans lesquels chercher
 * @param options - Options de recherche (limit, offset)
 * @returns Tableau de clés avec leur score de similarité
 */
