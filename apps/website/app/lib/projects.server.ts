import type { Project } from "../../drizzle/schema";
import { db, schema } from "./db.server";
import { count, eq, and, inArray, isNull, getColumns } from "drizzle-orm";

export async function getProjectBySlug(organizationId: number, slug: string) {
  return await db.query.projects.findFirst({
    where: { organizationId, slug },
  });
}

type ProjectDeletionSummary = {
  keyCount: number;
  translationCount: number;
  branchCount: number;
};

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

type ProjectWithInfos = Project & {
  translationKeyCount: number;
  // languages: Array<ProjectLanguage>;
};

export async function getProjectsForOrganization(
  organizationId: number,
): Promise<Array<ProjectWithInfos>> {
  const projectWithInfos = await db
    .select({
      ...getColumns(schema.projects),
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
    .leftJoin(
      schema.projectLanguages,
      eq(schema.projectLanguages.projectId, schema.projects.id),
    )
    .where(eq(schema.projects.organizationId, organizationId))
    .groupBy(schema.projects.id)
    .orderBy(schema.projects.name);

  return projectWithInfos;
}

type LanguageForProject = {
  projectId: number;
  locale: string;
  isDefault: boolean | null;
};

export async function getProjectLanguagesForProjects(
  projectList: Array<{ id: number }>,
): Promise<Array<LanguageForProject>> {
  if (projectList.length === 0) {
    return [];
  }

  const projectIds = projectList.map((p) => p.id);

  return await db
    .select({
      projectId: schema.projectLanguages.projectId,
      locale: schema.projectLanguages.locale,
      isDefault: schema.projectLanguages.isDefault,
    })
    .from(schema.projectLanguages)
    .where(inArray(schema.projectLanguages.projectId, projectIds))
    .orderBy(schema.projectLanguages.locale);
}

type TranslationCoverageForProject = {
  projectId: number;
  translatedCount: number;
};

export async function getTranslationCoverageForProjects(
  projects: Array<{ id: number }>,
): Promise<Array<TranslationCoverageForProject>> {
  if (projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((p) => p.id);

  return await db
    .select({
      projectId: schema.translationKeys.projectId,
      translatedCount: count(schema.translations.id),
    })
    .from(schema.translationKeys)
    .innerJoin(
      schema.projectLanguages,
      and(
        eq(schema.projectLanguages.projectId, schema.translationKeys.projectId),
        eq(schema.projectLanguages.isDefault, false),
      ),
    )
    .leftJoin(
      schema.translations,
      and(
        eq(schema.translations.keyId, schema.translationKeys.id),
        eq(schema.translations.locale, schema.projectLanguages.locale),
      ),
    )
    .where(
      and(
        inArray(schema.translationKeys.projectId, projectIds),
        isNull(schema.translationKeys.deletedAt),
        isNull(schema.translationKeys.branchId),
      ),
    )
    .groupBy(schema.translationKeys.projectId);
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

export async function getProjectDeletionSummary(
  projectId: number,
): Promise<ProjectDeletionSummary> {
  const keyCondition = and(
    eq(schema.translationKeys.projectId, projectId),
    isNull(schema.translationKeys.deletedAt),
  );

  const [translationResult] = await db
    .select({ count: count() })
    .from(schema.translations)
    .innerJoin(
      schema.translationKeys,
      eq(schema.translations.keyId, schema.translationKeys.id),
    )
    .where(keyCondition);

  const [keyCount, branchCount] = await Promise.all([
    db.$count(schema.translationKeys, keyCondition),
    db.$count(schema.branches, eq(schema.branches.projectId, projectId)),
  ]);

  return {
    keyCount,
    translationCount: Number(translationResult?.count ?? 0),
    branchCount,
  };
}

export async function deleteProject(projectId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const branchIds = await tx
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(eq(schema.branches.projectId, projectId));
    const translationKeyIds = await tx
      .select({ id: schema.translationKeys.id })
      .from(schema.translationKeys)
      .where(eq(schema.translationKeys.projectId, projectId));

    if (branchIds.length > 0) {
      await tx.delete(schema.branchKeyDeletions).where(
        inArray(
          schema.branchKeyDeletions.branchId,
          branchIds.map((branch) => branch.id),
        ),
      );
    }

    if (translationKeyIds.length > 0) {
      await tx.delete(schema.translations).where(
        inArray(
          schema.translations.keyId,
          translationKeyIds.map((key) => key.id),
        ),
      );
    }

    await tx
      .delete(schema.translationKeys)
      .where(eq(schema.translationKeys.projectId, projectId));
    await tx
      .delete(schema.branches)
      .where(eq(schema.branches.projectId, projectId));
    await tx
      .delete(schema.projectLanguages)
      .where(eq(schema.projectLanguages.projectId, projectId));
    await tx.delete(schema.projects).where(eq(schema.projects.id, projectId));
  });
}
