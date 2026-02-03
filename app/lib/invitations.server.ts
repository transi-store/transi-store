import { db, schema } from "./db.server";
import { eq, and, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";
import type { OrganizationInvitation, User } from "../../drizzle/schema";

/**
 * Génère un code d'invitation unique
 */
function generateInvitationCode(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Crée une invitation pour rejoindre une organisation
 */
export async function createInvitation(params: {
  organizationId: number;
  invitedEmail: string;
  invitedBy: number;
}) {
  // Supprimer toutes les invitations existantes pour cet email
  // (les anciennes invitations ne sont plus valides)
  await db
    .delete(schema.organizationInvitations)
    .where(
      and(
        eq(
          schema.organizationInvitations.organizationId,
          params.organizationId,
        ),
        eq(schema.organizationInvitations.invitedEmail, params.invitedEmail),
      ),
    );

  const invitationCode = generateInvitationCode();

  const [invitation] = await db
    .insert(schema.organizationInvitations)
    .values({
      organizationId: params.organizationId,
      invitedEmail: params.invitedEmail,
      invitedBy: params.invitedBy,
      invitationCode,
      isUnlimited: false,
    })
    .returning();

  return invitation;
}

/**
 * Crée un lien d'invitation illimité pour une organisation
 */
export async function createOrganizationInvitation(params: {
  organizationId: number;
  invitedBy: number;
}) {
  // Vérifier s'il existe déjà un lien d'invitation illimité pour cette organisation
  const existing = await db
    .select()
    .from(schema.organizationInvitations)
    .where(
      and(
        eq(
          schema.organizationInvitations.organizationId,
          params.organizationId,
        ),
        eq(schema.organizationInvitations.isUnlimited, true),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const invitationCode = generateInvitationCode();

  const [invitation] = await db
    .insert(schema.organizationInvitations)
    .values({
      organizationId: params.organizationId,
      invitedEmail: null,
      invitedBy: params.invitedBy,
      invitationCode,
      isUnlimited: true,
    })
    .returning();

  return invitation;
}

/**
 * Récupère le lien d'invitation illimité pour une organisation s'il existe
 */
export async function getOrganizationInvitation(
  organizationId: number,
): Promise<OrganizationInvitation | null> {
  const invitations = await db
    .select()
    .from(schema.organizationInvitations)
    .where(
      and(
        eq(schema.organizationInvitations.organizationId, organizationId),
        eq(schema.organizationInvitations.isUnlimited, true),
      ),
    )
    .limit(1);

  return invitations.length > 0 ? invitations[0] : null;
}

export type PendingInvitation = OrganizationInvitation & {
  inviter: Pick<User, "id" | "name" | "email"> | null;
};

/**
 * Récupère toutes les invitations en attente pour une organisation
 * (seulement les invitations par email, pas les liens illimités)
 */
export async function getPendingInvitations(
  organizationId: number,
): Promise<Array<PendingInvitation>> {
  const invitations = await db
    .select()
    .from(schema.organizationInvitations)
    .where(
      and(
        eq(schema.organizationInvitations.organizationId, organizationId),
        eq(schema.organizationInvitations.isUnlimited, false),
      ),
    );

  // Récupérer les utilisateurs qui ont invité
  const inviterIds = invitations.map((i) => i.invitedBy);
  const inviters =
    inviterIds.length > 0
      ? await db
          .select({
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
          })
          .from(schema.users)
          .where(inArray(schema.users.id, inviterIds))
      : [];

  return invitations.map((invitation) => ({
    ...invitation,
    inviter: inviters.find((u) => u.id === invitation.invitedBy) ?? null,
  }));
}

/**
 * Récupère une invitation par son code
 */
export async function getInvitationByCode(invitationCode: string) {
  const invitations = await db
    .select()
    .from(schema.organizationInvitations)
    .where(eq(schema.organizationInvitations.invitationCode, invitationCode))
    .limit(1);

  if (invitations.length === 0) {
    return null;
  }

  const invitation = invitations[0];

  // Récupérer l'organisation
  const organizations = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, invitation.organizationId))
    .limit(1);

  // Récupérer l'utilisateur qui a invité
  const inviters = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
    })
    .from(schema.users)
    .where(eq(schema.users.id, invitation.invitedBy))
    .limit(1);

  return {
    ...invitation,
    organization: organizations[0] ?? null,
    inviter: inviters[0] ?? null,
  };
}

/**
 * Accepte une invitation et ajoute l'utilisateur à l'organisation
 */
export async function acceptInvitation(invitationCode: string, userId: number) {
  const invitation = await getInvitationByCode(invitationCode);

  if (!invitation) {
    throw new Error("Invitation introuvable");
  }

  // Vérifier si l'utilisateur n'est pas déjà membre
  const existingMembership = await db
    .select()
    .from(schema.organizationMembers)
    .where(
      and(
        eq(
          schema.organizationMembers.organizationId,
          invitation.organizationId,
        ),
        eq(schema.organizationMembers.userId, userId),
      ),
    )
    .limit(1);

  if (existingMembership.length > 0) {
    // Déjà membre, on supprime l'invitation seulement si elle n'est pas illimitée
    if (!invitation.isUnlimited) {
      await db
        .delete(schema.organizationInvitations)
        .where(eq(schema.organizationInvitations.id, invitation.id));
    }

    return invitation.organization!;
  }

  // Transaction : ajouter le membre et supprimer l'invitation si elle n'est pas illimitée
  await db.transaction(async (tx) => {
    // Ajouter l'utilisateur comme membre
    await tx.insert(schema.organizationMembers).values({
      organizationId: invitation.organizationId,
      userId,
    });

    // Supprimer l'invitation seulement si elle n'est pas illimitée
    if (!invitation.isUnlimited) {
      await tx
        .delete(schema.organizationInvitations)
        .where(eq(schema.organizationInvitations.id, invitation.id));
    }
  });

  return invitation.organization!;
}

/**
 * Annule une invitation (la supprime)
 */
export async function cancelInvitation(
  invitationId: number,
  organizationId: number,
) {
  const invitation = await db
    .select()
    .from(schema.organizationInvitations)
    .where(eq(schema.organizationInvitations.id, invitationId))
    .limit(1);

  if (
    invitation.length === 0 ||
    invitation[0].organizationId !== organizationId
  ) {
    throw new Error("Invitation introuvable");
  }

  await db
    .delete(schema.organizationInvitations)
    .where(eq(schema.organizationInvitations.id, invitationId));
}

/**
 * Supprime un membre d'une organisation
 */
export async function removeMemberFromOrganization(
  membershipId: number,
  organizationId: number,
) {
  const membership = await db
    .select()
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.id, membershipId))
    .limit(1);

  if (
    membership.length === 0 ||
    membership[0].organizationId !== organizationId
  ) {
    throw new Error("Membre introuvable");
  }

  // Vérifier qu'il reste au moins un membre dans l'organisation
  const membersCount = await db
    .select()
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.organizationId, organizationId));

  if (membersCount.length <= 1) {
    throw new Error(
      "Impossible de supprimer le dernier membre de l'organisation",
    );
  }

  await db
    .delete(schema.organizationMembers)
    .where(eq(schema.organizationMembers.id, membershipId));
}
