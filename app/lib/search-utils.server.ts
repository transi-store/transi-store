import { sql } from "drizzle-orm";

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
