import { sql, and, or, inArray, eq, desc } from "drizzle-orm";
import { db, schema } from "./db.server";

/**
 * Seuil de similarité minimum pour la recherche floue (0-1)
 * Utilisé pour filtrer les résultats de recherche basés sur le score de similarité
 */
export const SIMILARITY_THRESHOLD = 0.1;

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
export async function searchTranslationKeys(
  searchQuery: string,
  projectIds: number | number[],
  options?: {
    limit?: number;
    offset?: number;
  },
) {
  const projectIdArray = Array.isArray(projectIds) ? projectIds : [projectIds];
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  return await db
    .select({
      key: schema.translationKeys,
      similarity: maxSimilarity(
        schema.translationKeys.keyName,
        searchQuery,
      ).as("similarity"),
    })
    .from(schema.translationKeys)
    .where(
      and(
        inArray(schema.translationKeys.projectId, projectIdArray),
        or(
          sql`${maxSimilarity(schema.translationKeys.keyName, searchQuery)} > ${SIMILARITY_THRESHOLD}`,
          sql`${maxSimilarity(schema.translationKeys.description, searchQuery)} > ${SIMILARITY_THRESHOLD}`,
        )!,
      ),
    )
    .orderBy(desc(sql`similarity`))
    .limit(limit)
    .offset(offset);
}
