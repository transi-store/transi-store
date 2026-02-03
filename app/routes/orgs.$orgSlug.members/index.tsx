import { Container, VStack } from "@chakra-ui/react";
import { useLoaderData, useActionData } from "react-router";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "react-router";
import type { Route } from "./+types/index";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import {
  createInvitation,
  getPendingInvitations,
  cancelInvitation,
  removeMemberFromOrganization,
  createOrganizationInvitation,
  getOrganizationInvitation,
  type PendingInvitation,
} from "~/lib/invitations.server";
import { db, schema } from "~/lib/db.server";
import { getOrigin } from "~/lib/origin.server";
import { getInstance } from "~/middleware/i18next";
import MembersList from "./Members";
import Invitations from "./Invitations";
import type { OrganizationMember, User } from "../../../drizzle/schema";

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "invite-user") {
    const email = formData.get("email") as string;

    if (!email || !email.includes("@")) {
      return {
        success: false,
        error: i18next.t("members.errors.invalidEmail"),
      };
    }

    try {
      const invitation = await createInvitation({
        organizationId: organization.id,
        invitedEmail: email.toLowerCase().trim(),
        invitedBy: user.userId,
      });

      return {
        success: true,
        invitationCode: invitation.invitationCode,
        action: "invite",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : i18next.t("members.errors.createInvitation"),
      };
    }
  }

  if (intent === "create-org-invitation") {
    try {
      const invitation = await createOrganizationInvitation({
        organizationId: organization.id,
        invitedBy: user.userId,
      });

      return {
        success: true,
        invitationCode: invitation.invitationCode,
        action: "create-org-invitation",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : i18next.t("members.errors.createOrgInvitation"),
      };
    }
  }

  if (intent === "cancel-invitation") {
    const invitationId = parseInt(formData.get("invitationId") as string, 10);

    try {
      await cancelInvitation(invitationId, organization.id);
      return redirect(`/orgs/${params.orgSlug}/members`);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : i18next.t("members.errors.cancelInvitation"),
      };
    }
  }

  if (intent === "remove-member") {
    const membershipId = parseInt(formData.get("membershipId") as string, 10);

    try {
      await removeMemberFromOrganization(membershipId, organization.id);
      return redirect(`/orgs/${params.orgSlug}/members`);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : i18next.t("members.errors.removeMember"),
      };
    }
  }

  return { success: false, error: i18next.t("members.errors.invalidAction") };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  // Récupérer les membres
  const memberships: Array<OrganizationMember> = await db
    .select()
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.organizationId, organization.id));

  // Récupérer les utilisateurs correspondants
  const userIds = memberships.map((m) => m.userId);
  const users =
    userIds.length > 0
      ? await db
          .select()
          .from(schema.users)
          .where(inArray(schema.users.id, userIds))
      : [];

  // Combiner les données
  const members: Array<
    OrganizationMember & { user: User; isCurrentUser: boolean }
  > = memberships.map((m) => ({
    ...m,
    user: users.find((u) => u.id === m.userId)!,
    isCurrentUser: m.userId === user.userId,
  }));

  // Récupérer les invitations en attente
  const pendingInvitations: Array<PendingInvitation> =
    await getPendingInvitations(organization.id);

  // Récupérer le lien d'invitation illimité s'il existe
  const organizationInvitation = await getOrganizationInvitation(
    organization.id,
  );

  return {
    members,
    pendingInvitations,
    organizationInvitation,
    organization,
    origin: getOrigin(request),
  };
}

export default function OrganizationMembers() {
  const { members, pendingInvitations, organizationInvitation, origin } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const newInvitationCode =
    actionData?.success && actionData.action === "invite"
      ? actionData.invitationCode
      : undefined;

  return (
    <Container maxW="container.lg" py={8}>
      <VStack align="stretch" gap={6}>
        <Invitations
          organizationInvitation={organizationInvitation}
          pendingInvitations={pendingInvitations}
          origin={origin}
          newInvitationCode={newInvitationCode}
          actionError={
            actionData?.success === false ? actionData.error : undefined
          }
        />

        <MembersList members={members} />
      </VStack>
    </Container>
  );
}
