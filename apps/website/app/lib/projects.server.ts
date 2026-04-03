import { db, schema } from "./db.server";
import { count, eq, and, isNull } from "drizzle-orm";

export async function getProjectBySlug(organizationId: number, slug: string) {
  return await db.query.projects.findFirst({
    where: { organizationId, slug },
  });
}

type CreateProjectParams = {
  organizationId: number;
  name: string;
  slug: string;
  description?: string;
  createdBy: number;
};

export async function createProject(params: CreateProjectParams) {
  const [project] = await db
    .insert(schema.projects)
    .values({
      organizationId: params.organizationId,
      name: params.name,
      slug: params.slug,
      description: params.description,
      createdBy: params.createdBy,
    })
    .returning();

  return project.id;
}

export async function isProjectSlugAvailable(
  organizationId: number,
  slug: string,
): Promise<boolean> {
  const existing = await db.query.projects.findFirst({
    where: { organizationId, slug },
  });

  return !existing;
}

export async function getProjectsForOrganization(organizationId: number) {
  return await db
    .select({
      id: schema.projects.id,
      name: schema.projects.name,
      slug: schema.projects.slug,
      description: schema.projects.description,
      createdAt: schema.projects.createdAt,
      translationKeyCount: count(schema.translationKeys.id),
    })
    .from(schema.projects)
    .leftJoin(
      schema.translationKeys,
      and(
        eq(schema.translationKeys.projectId, schema.projects.id),
        isNull(schema.translationKeys.deletedAt),
        isNull(schema.translationKeys.branchId),
      ),
    )
    .where(eq(schema.projects.organizationId, organizationId))
    .groupBy(schema.projects.id)
    .orderBy(schema.projects.createdAt);
}

export async function countProjectsForOrganization(organizationId: number) {
  const result = await db
    .select({
      count: count(),
    })
    .from(schema.projects)
    .where(eq(schema.projects.organizationId, organizationId))
    .execute();

  return Number(result[0].count);
}

export async function countMembersForOrganization(organizationId: number) {
  const result = await db
    .select({
      count: count(),
    })
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.organizationId, organizationId))
    .execute();

  return Number(result[0].count);
}

export async function getProjectLanguages(projectId: number) {
  return await db.query.projectLanguages.findMany({
    where: { projectId },
  });
}

type AddLanguageParams = {
  projectId: number;
  locale: string;
  isDefault?: boolean;
};

export async function addLanguageToProject(params: AddLanguageParams) {
  const [language] = await db
    .insert(schema.projectLanguages)
    .values({
      projectId: params.projectId,
      locale: params.locale,
      isDefault: params.isDefault ?? false,
    })
    .returning();

  return language.id;
}

export async function removeLanguageFromProject(
  projectId: number,
  locale: string,
) {
  await db
    .delete(schema.projectLanguages)
    .where(
      and(
        eq(schema.projectLanguages.projectId, projectId),
        eq(schema.projectLanguages.locale, locale),
      ),
    );
}
