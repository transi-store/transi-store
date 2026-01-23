import { db, schema } from "./db.server";
import { eq, and, like, or, inArray } from "drizzle-orm";

export interface SearchResult {
  keyId: string;
  keyName: string;
  keyDescription: string | null;
  projectId: string;
  projectName: string;
  projectSlug: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  translationLocale?: string;
  translationValue?: string;
  matchType: "key" | "translation";
}

export async function globalSearch(
  userId: string,
  query: string,
  options?: {
    organizationId?: string;
    projectId?: string;
    locale?: string;
    limit?: number;
  }
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchPattern = `%${query}%`;
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
  const projectConditions = [inArray(schema.projects.organizationId, userOrgIds)];

  if (options?.organizationId) {
    projectConditions.push(eq(schema.projects.organizationId, options.organizationId));
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

  // Build conditions for translation keys
  const keyConditions = [
    inArray(schema.translationKeys.projectId, projectIds),
    or(
      like(schema.translationKeys.keyName, searchPattern),
      like(schema.translationKeys.description, searchPattern)
    )!,
  ];

  // Search in translation keys
  const keys = await db
    .select()
    .from(schema.translationKeys)
    .where(and(...keyConditions))
    .limit(limit);

  // Search in translations
  const translationConditions = [
    inArray(schema.translations.keyId,
      await db
        .select({ id: schema.translationKeys.id })
        .from(schema.translationKeys)
        .where(inArray(schema.translationKeys.projectId, projectIds))
        .then(rows => rows.map(r => r.id))
    ),
    like(schema.translations.value, searchPattern),
  ];

  if (options?.locale) {
    translationConditions.push(eq(schema.translations.locale, options.locale));
  }

  const translations = await db
    .select()
    .from(schema.translations)
    .where(and(...translationConditions))
    .limit(limit);

  // Get translation keys for the translations found
  const translationKeyIds = [...new Set(translations.map((t) => t.keyId))];
  const translationKeys = translationKeyIds.length > 0
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
    };
  });

  // Combine and deduplicate by keyId (prioritize key matches)
  const allResults = [...keyResults, ...translationResults];
  const uniqueResults = new Map<string, SearchResult>();

  for (const result of allResults) {
    const existing = uniqueResults.get(result.keyId);

    // If key match exists, keep it. Otherwise, add translation match
    if (!existing || result.matchType === "key") {
      uniqueResults.set(result.keyId, result);
    }
  }

  return Array.from(uniqueResults.values()).slice(0, limit);
}
