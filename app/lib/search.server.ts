import { db, schema } from "./db.server";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import {
  maxSimilarity,
  searchTranslationKeysUniversal,
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

  // Utilise la logique mutualisée
  const results = await searchTranslationKeysUniversal(
    searchQuery,
    projectIds,
    { limit, locale: options?.locale },
  );

  // Get organizations et projets pour enrichir les résultats
  const organizations = await db
    .select()
    .from(schema.organizations)
    .where(inArray(schema.organizations.id, userOrgIds));
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const orgMap = new Map(organizations.map((o) => [o.id, o]));

  // Mappe les résultats pour enrichir avec noms/slug projet/org
  return results.map((row) => {
    const key = row.key;
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
      matchType: row.matchType,
      translationLocale: row.translationLocale,
      translationValue: row.translationValue,
      similarity: row.similarity,
    };
  });
}
