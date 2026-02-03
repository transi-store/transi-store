import { db, schema } from "./db.server";
import { eq, inArray } from "drizzle-orm";
import type { SessionData } from "./session.server";

export async function getUserOrganizations(userId: number) {
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

async function getOrganizationBySlug(slug: string) {
  return await db.query.organizations.findFirst({
    where: { slug },
  });
}

async function isUserMemberOfOrganization(
  userId: number,
  organizationId: number,
): Promise<boolean> {
  const membership = await db.query.organizationMembers.findFirst({
    where: { userId, organizationId },
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

type CreateOrganizationParams = {
  name: string;
  slug: string;
  createdBy: number;
};

export async function createOrganization(
  params: CreateOrganizationParams,
): Promise<number> {
  let organizationId: number;

  await db.transaction(async (tx) => {
    // Créer l'organisation
    const [org] = await tx
      .insert(schema.organizations)
      .values({
        name: params.name,
        slug: params.slug,
      })
      .returning();

    organizationId = org.id;

    // Ajouter le créateur comme membre
    await tx.insert(schema.organizationMembers).values({
      organizationId: org.id,
      userId: params.createdBy,
    });
  });

  return organizationId!;
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await db.query.organizations.findFirst({
    where: { slug },
  });

  return !existing;
}

export async function updateUserLastOrganization(
  userId: number,
  organizationId: number,
): Promise<void> {
  await db
    .update(schema.users)
    .set({
      lastOrganizationId: organizationId,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));
}
