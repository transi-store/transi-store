import { db, schema } from "./db.server";
import { eq, and, inArray } from "drizzle-orm";
import type { SessionData } from "./session.server";

export async function getUserOrganizations(userId: string) {
  // Récupérer les IDs des organisations dont l'utilisateur est membre
  const memberships = await db
    .select({
      organizationId: schema.organizationMembers.organizationId,
    })
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.userId, userId));

  if (memberships.length === 0) {
    return [];
  }

  const organizationIds = memberships.map((m) => m.organizationId);

  // Récupérer les organisations
  const organizations = await db
    .select()
    .from(schema.organizations)
    .where(inArray(schema.organizations.id, organizationIds));

  return organizations;
}

export async function getOrganizationBySlug(slug: string) {
  return await db.query.organizations.findFirst({
    where: eq(schema.organizations.slug, slug),
  });
}

export async function isUserMemberOfOrganization(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const membership = await db.query.organizationMembers.findFirst({
    where: and(
      eq(schema.organizationMembers.userId, userId),
      eq(schema.organizationMembers.organizationId, organizationId),
    ),
  });

  return !!membership;
}

export async function requireOrganizationMembership(
  user: SessionData,
  organizationSlug: string,
) {
  const organization = await getOrganizationBySlug(organizationSlug);

  if (!organization) {
    throw new Response("Organization not found", { status: 404 });
  }

  const isMember = await isUserMemberOfOrganization(
    user.userId,
    organization.id,
  );

  if (!isMember) {
    throw new Response("Forbidden", { status: 403 });
  }

  return organization;
}

interface CreateOrganizationParams {
  name: string;
  slug: string;
  createdBy: string;
}

export async function createOrganization(params: CreateOrganizationParams) {
  const organizationId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    // Créer l'organisation
    await tx.insert(schema.organizations).values({
      id: organizationId,
      name: params.name,
      slug: params.slug,
    });

    // Ajouter le créateur comme membre
    await tx.insert(schema.organizationMembers).values({
      id: crypto.randomUUID(),
      organizationId,
      userId: params.createdBy,
    });
  });

  return organizationId;
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await db.query.organizations.findFirst({
    where: eq(schema.organizations.slug, slug),
  });

  return !existing;
}

export async function updateUserLastOrganization(
  userId: string,
  organizationId: string,
): Promise<void> {
  await db
    .update(schema.users)
    .set({
      lastOrganizationId: organizationId,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));
}

export async function getOrganizationById(organizationId: string) {
  return await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, organizationId),
  });
}
