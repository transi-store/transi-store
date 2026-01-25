import { db, schema } from "./db.server";
import { eq, and, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";

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
  organizationId: string;
  invitedEmail: string;
  invitedBy: string;
}) {
  // Vérifier si une invitation en attente existe déjà pour cet email
  const existingInvitation = await db
    .select()
    .from(schema.organizationInvitations)
    .where(
      and(
        eq(
          schema.organizationInvitations.organizationId,
          params.organizationId,
        ),
        eq(schema.organizationInvitations.invitedEmail, params.invitedEmail),
        eq(schema.organizationInvitations.status, "pending"),
      ),
    )
    .limit(1);

  if (existingInvitation.length > 0) {
    throw new Error(
      "Une invitation en attente existe déjà pour cet utilisateur",
    );
  }

  const invitationCode = generateInvitationCode();

  const [invitation] = await db
    .insert(schema.organizationInvitations)
    .values({
      id: crypto.randomUUID(),
      organizationId: params.organizationId,
      invitedEmail: params.invitedEmail,
      invitedBy: params.invitedBy,
      invitationCode,
      status: "pending",
    })
    .returning();

  return invitation;
}

/**
 * Récupère toutes les invitations en attente pour une organisation
 */
export async function getPendingInvitations(organizationId: string) {
  const invitations = await db
    .select()
    .from(schema.organizationInvitations)
    .where(
      and(
        eq(schema.organizationInvitations.organizationId, organizationId),
        eq(schema.organizationInvitations.status, "pending"),
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
    inviter: inviters.find((u) => u.id === invitation.invitedBy) || null,
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
    organization: organizations[0] || null,
    inviter: inviters[0] || null,
  };
}

/**
 * Accepte une invitation et ajoute l'utilisateur à l'organisation
 */
export async function acceptInvitation(invitationCode: string, userId: string) {
  const invitation = await getInvitationByCode(invitationCode);

  if (!invitation) {
    throw new Error("Invitation introuvable");
  }

  if (invitation.status !== "pending") {
    throw new Error("Cette invitation n'est plus valide");
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
    // Marquer l'invitation comme acceptée même si déjà membre
    await db
      .update(schema.organizationInvitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(schema.organizationInvitations.id, invitation.id));

    return invitation.organization!;
  }

  // Transaction : ajouter le membre et marquer l'invitation comme acceptée
  await db.transaction(async (tx) => {
    // Ajouter l'utilisateur comme membre
    await tx.insert(schema.organizationMembers).values({
      id: crypto.randomUUID(),
      organizationId: invitation.organizationId,
      userId,
    });

    // Marquer l'invitation comme acceptée
    await tx
      .update(schema.organizationInvitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(schema.organizationInvitations.id, invitation.id));
  });

  return invitation.organization!;
}

/**
 * Annule une invitation
 */
export async function cancelInvitation(
  invitationId: string,
  organizationId: string,
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

  if (invitation[0].status !== "pending") {
    throw new Error("Cette invitation ne peut plus être annulée");
  }

  await db
    .update(schema.organizationInvitations)
    .set({
      status: "cancelled",
    })
    .where(eq(schema.organizationInvitations.id, invitationId));
}

/**
 * Supprime un membre d'une organisation
 */
export async function removeMemberFromOrganization(
  membershipId: string,
  organizationId: string,
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
