import { db, schema } from "./db.server";
import { eq, and } from "drizzle-orm";

export async function getProjectBySlug(organizationId: string, slug: string) {
  return await db.query.projects.findFirst({
    where: { organizationId, slug },
  });
}

interface CreateProjectParams {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  createdBy: string;
}

export async function createProject(params: CreateProjectParams) {
  const projectId = crypto.randomUUID();

  await db.insert(schema.projects).values({
    id: projectId,
    organizationId: params.organizationId,
    name: params.name,
    slug: params.slug,
    description: params.description,
    createdBy: params.createdBy,
  });

  return projectId;
}

export async function isProjectSlugAvailable(
  organizationId: string,
  slug: string,
): Promise<boolean> {
  const existing = await db.query.projects.findFirst({
    where: { organizationId, slug },
  });

  return !existing;
}

export async function getProjectLanguages(projectId: string) {
  return await db.query.projectLanguages.findMany({
    where: { projectId },
  });
}

interface AddLanguageParams {
  projectId: string;
  locale: string;
  isDefault?: boolean;
}

export async function addLanguageToProject(params: AddLanguageParams) {
  const languageId = crypto.randomUUID();

  await db.insert(schema.projectLanguages).values({
    id: languageId,
    projectId: params.projectId,
    locale: params.locale,
    isDefault: params.isDefault || false,
  });

  return languageId;
}

export async function removeLanguageFromProject(
  projectId: string,
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
