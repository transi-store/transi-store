import { db, schema } from "./db.server";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import {
  maxSimilarity,
  SIMILARITY_THRESHOLD,
  searchTranslationKeys,
} from "./search-utils.server";

export interface SearchResult {
  keyId: number;
  keyName: string;
  keyDescription: string | null;
  projectId: number;
  projectName: string;
  projectSlug: string;
  organizationId: number;
  organizationName: string;
  organizationSlug: string;
  translationLocale?: string;
  translationValue?: string;
  matchType: "key" | "translation";
  similarity?: number; // Score de similarité (0-1)
}

export async function globalSearch(
  userId: number,
  query: string,
  options?: {
    organizationId?: number;
    projectId?: number;
    locale?: string;
    limit?: number;
  },
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchQuery = query.trim();
  const limit = options?.limit || 100;

  // Get user's organization IDs
  const memberships = await db
    .select({ organizationId: schema.organizationMembers.organizationId })
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.userId, userId));

  if (memberships.length === 0) {
    return [];
  }

  const userOrgIds = memberships.map((m) => m.organizationId);

  // Build conditions for projects
  const projectConditions = [
    inArray(schema.projects.organizationId, userOrgIds),
  ];

  if (options?.organizationId) {
    projectConditions.push(
      eq(schema.projects.organizationId, options.organizationId),
    );
  }

  if (options?.projectId) {
    projectConditions.push(eq(schema.projects.id, options.projectId));
  }

  // Get all projects in user's organizations
  const projects = await db
    .select()
    .from(schema.projects)
    .where(and(...projectConditions));

  if (projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((p) => p.id);

  // Search in translation keys avec score de similarité
  const keysWithSimilarity = await searchTranslationKeys(
    searchQuery,
    projectIds,
    {
      limit,
    },
  );

  const keys = keysWithSimilarity.map((row) => row.key);
  const keysSimilarityMap = new Map(
    keysWithSimilarity.map((row) => [row.key.id, row.similarity]),
  );

  // Search in translations avec score de similarité
  const translationConditions = [
    inArray(
      schema.translations.keyId,
      await db
        .select({ id: schema.translationKeys.id })
        .from(schema.translationKeys)
        .where(inArray(schema.translationKeys.projectId, projectIds))
        .then((rows) => rows.map((r) => r.id)),
    ),
    sql`${maxSimilarity(schema.translations.value, searchQuery)} > ${SIMILARITY_THRESHOLD}`,
  ];

  if (options?.locale) {
    translationConditions.push(eq(schema.translations.locale, options.locale));
  }

  const translationsWithSimilarity = await db
    .select({
      translation: schema.translations,
      similarity: maxSimilarity(schema.translations.value, searchQuery).as(
        "similarity",
      ),
    })
    .from(schema.translations)
    .where(and(...translationConditions))
    .orderBy(desc(sql`similarity`))
    .limit(limit);

  const translations = translationsWithSimilarity.map((row) => row.translation);
  const translationsSimilarityMap = new Map(
    translationsWithSimilarity.map((row) => [
      row.translation.id,
      row.similarity,
    ]),
  );

  // Get translation keys for the translations found
  const translationKeyIds = [...new Set(translations.map((t) => t.keyId))];
  const translationKeys =
    translationKeyIds.length > 0
      ? await db
          .select()
          .from(schema.translationKeys)
          .where(inArray(schema.translationKeys.id, translationKeyIds))
      : [];

  // Get organizations
  const organizations = await db
    .select()
    .from(schema.organizations)
    .where(inArray(schema.organizations.id, userOrgIds));

  // Create maps for quick lookup
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const orgMap = new Map(organizations.map((o) => [o.id, o]));
  const keyMap = new Map(translationKeys.map((k) => [k.id, k]));

  // Build results from keys
  const keyResults: SearchResult[] = keys.map((key) => {
    const project = projectMap.get(key.projectId)!;
    const org = orgMap.get(project.organizationId)!;

    return {
      keyId: key.id,
      keyName: key.keyName,
      keyDescription: key.description,
      projectId: project.id,
      projectName: project.name,
      projectSlug: project.slug,
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      matchType: "key" as const,
      similarity: keysSimilarityMap.get(key.id),
    };
  });

  // Build results from translations
  const translationResults: SearchResult[] = translations.map((translation) => {
    const key = keyMap.get(translation.keyId)!;
    const project = projectMap.get(key.projectId)!;
    const org = orgMap.get(project.organizationId)!;

    return {
      keyId: key.id,
      keyName: key.keyName,
      keyDescription: key.description,
      projectId: project.id,
      projectName: project.name,
      projectSlug: project.slug,
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      translationLocale: translation.locale,
      translationValue: translation.value,
      matchType: "translation" as const,
      similarity: translationsSimilarityMap.get(translation.id),
    };
  });

  // Combine and deduplicate by keyId (prioritize key matches)
  const allResults = [...keyResults, ...translationResults];
  const uniqueResults = new Map<number, SearchResult>();

  for (const result of allResults) {
    const existing = uniqueResults.get(result.keyId);

    // Prioriser les matches sur les clés, ou prendre le meilleur score
    if (!existing) {
      uniqueResults.set(result.keyId, result);
    } else if (result.matchType === "key") {
      uniqueResults.set(result.keyId, result);
    } else if (
      existing.matchType !== "key" &&
      (result.similarity || 0) > (existing.similarity || 0)
    ) {
      uniqueResults.set(result.keyId, result);
    }
  }

  // Trier par score de similarité décroissant
  return Array.from(uniqueResults.values())
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, limit);
}
