import {
  Heading,
  VStack,
  Box,
  Text,
  Button,
  Input,
  IconButton,
  HStack,
  Card,
  Badge,
  Alert,
  Code,
} from "@chakra-ui/react";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DialogBackdrop,
  DialogPositioner,
  Portal,
} from "@chakra-ui/react";
import { useLoaderData, Form, useActionData } from "react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  LuPlus,
  LuTrash2,
  LuCopy,
  LuMail,
  LuTriangleAlert,
} from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.members";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import {
  createInvitation,
  getPendingInvitations,
  cancelInvitation,
  removeMemberFromOrganization,
  createOrganizationInvitation,
  getOrganizationInvitation,
} from "~/lib/invitations.server";
import { db, schema } from "~/lib/db.server";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "react-router";
import { toaster } from "~/components/ui/toaster";
import { getOrigin } from "~/lib/origin.server";
import { getInstance } from "~/middleware/i18next";

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
  const memberships = await db
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
  const members = memberships.map((m) => ({
    ...m,
    user: users.find((u) => u.id === m.userId)!,
    isCurrentUser: m.userId === user.userId,
  }));

  // Récupérer les invitations en attente
  const pendingInvitations = await getPendingInvitations(organization.id);

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
  const { t } = useTranslation();
  const { members, pendingInvitations, organizationInvitation, origin } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [currentLink, setCurrentLink] = useState<string>("");

  // Fermer la modale après création réussie
  useEffect(() => {
    if (actionData?.action === "invite" && actionData.success) {
      setIsInviteDialogOpen(false);
    }
  }, [actionData]);

  const handleCopyInvitationLink = async (code: string) => {
    const link = `${origin}/orgs/invite/${code}`;
    try {
      await navigator.clipboard.writeText(link);
      toaster.success({
        title: t("members.toasts.linkCopied.title"),
        description: t("members.toasts.linkCopied.description"),
      });
    } catch (error) {
      // En cas d'erreur (HTTP, permissions, etc.), afficher une modale avec le lien
      setCurrentLink(link);
      setShowLinkModal(true);
    }
  };

  return (
    <Box pt={6}>
      <HStack justify="space-between" mb={6}>
        <Heading as="h2" size="lg">
          {t("members.title")}
        </Heading>
        <Button colorScheme="brand" onClick={() => setIsInviteDialogOpen(true)}>
          <LuPlus /> {t("members.invite")}
        </Button>
      </HStack>

      {actionData?.error && (
        <Box mb={4} p={3} bg="red.50" borderRadius="md" color="red.700">
          {actionData.error}
        </Box>
      )}

      {/* Affichage du lien d'invitation après création */}
      {actionData?.action === "invite" && actionData.invitationCode && (
        <Alert.Root status="success" mb={4}>
          <Alert.Indicator>
            <LuTriangleAlert />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>{t("members.invitation.createdTitle")}</Alert.Title>
            <Alert.Description>
              <VStack align="stretch" gap={2} mt={2}>
                <Text fontSize="sm">{t("members.invitation.share")}</Text>
                <HStack>
                  <Code
                    p={2}
                    borderRadius="md"
                    fontSize="sm"
                    flex={1}
                    wordBreak="break-all"
                  >
                    {origin}/orgs/invite/
                    {actionData.invitationCode}
                  </Code>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleCopyInvitationLink(actionData.invitationCode!)
                    }
                    colorPalette="gray"
                  >
                    <LuCopy /> {t("members.copy")}
                  </Button>
                </HStack>
              </VStack>
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {/* Lien d'invitation pour l'organisation */}
      <VStack align="stretch" gap={4} mb={8}>
        <Heading as="h3" size="md">
          {t("members.inviteLink.title")}
        </Heading>

        {organizationInvitation ? (
          <Alert.Root status="info">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                {t("members.inviteLink.permanentTitle")}
              </Alert.Title>
              <Alert.Description>
                <VStack align="stretch" gap={2} mt={2}>
                  <Text fontSize="sm">
                    {t("members.inviteLink.permanentDescription")}
                  </Text>
                  <HStack>
                    <Code
                      p={2}
                      borderRadius="md"
                      fontSize="sm"
                      flex={1}
                      wordBreak="break-all"
                    >
                      {origin}/orgs/invite/
                      {organizationInvitation.invitationCode}
                    </Code>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleCopyInvitationLink(
                          organizationInvitation.invitationCode,
                        )
                      }
                      colorPalette="gray"
                    >
                      <LuCopy /> {t("copy")}
                    </Button>
                    <Form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="cancel-invitation"
                      />
                      <input
                        type="hidden"
                        name="invitationId"
                        value={organizationInvitation.id}
                      />
                      <Button type="submit" size="sm" colorPalette="red">
                        <LuTrash2 /> {t("members.inviteLink.delete")}
                      </Button>
                    </Form>
                  </HStack>
                </VStack>
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : (
          <Card.Root>
            <Card.Body>
              <VStack align="stretch" gap={3}>
                <Text fontSize="sm" color="gray.600">
                  {t("members.inviteLink.createDescription")}
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {t("members.inviteLink.differencesTitle")}
                </Text>
                <VStack align="stretch" gap={1} pl={4}>
                  <Text fontSize="sm" color="gray.600">
                    • <strong>{t("members.inviteLink.orgLinkLabel")}</strong>{" "}
                    {t("members.inviteLink.orgLinkDesc")}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    •{" "}
                    <strong>{t("members.inviteLink.emailInviteLabel")}</strong>{" "}
                    {t("members.inviteLink.emailInviteDesc")}
                  </Text>
                </VStack>
                <Form method="post">
                  <input
                    type="hidden"
                    name="intent"
                    value="create-org-invitation"
                  />
                  <Button type="submit" colorScheme="brand" mt={2}>
                    <LuPlus /> {t("members.createOrgInvitation")}
                  </Button>
                </Form>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>

      {/* Membres actuels */}
      <VStack align="stretch" gap={4} mb={8}>
        <Heading as="h3" size="md">
          {t("members.listTitle", { count: members.length })}
        </Heading>
        {members.map((member) => (
          <Card.Root key={member.id}>
            <Card.Body>
              <HStack justify="space-between">
                <Box flex="1">
                  <HStack>
                    <Text fontWeight="medium">
                      {member.user.name || member.user.email}
                    </Text>
                    {member.isCurrentUser && (
                      <Badge colorScheme="blue">{t("members.you")}</Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    {member.user.email}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {t("members.memberSince")}{" "}
                    {new Date(member.createdAt).toLocaleDateString("fr-FR")}
                  </Text>
                </Box>
                {!member.isCurrentUser && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="remove-member" />
                    <input
                      type="hidden"
                      name="membershipId"
                      value={member.id}
                    />
                    <IconButton
                      type="submit"
                      aria-label={t("members.removeMemberAria")}
                      variant="ghost"
                      colorScheme="red"
                      onClick={(e) => {
                        if (!confirm(t("members.removeMemberConfirm"))) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <LuTrash2 />
                    </IconButton>
                  </Form>
                )}
              </HStack>
            </Card.Body>
          </Card.Root>
        ))}
      </VStack>

      {/* Invitations en attente */}
      {pendingInvitations.length > 0 && (
        <VStack align="stretch" gap={4}>
          <Heading as="h3" size="md">
            {t("members.pendingTitle", { count: pendingInvitations.length })}
          </Heading>
          {pendingInvitations.map((invitation) => (
            <Card.Root key={invitation.id}>
              <Card.Body>
                <HStack justify="space-between">
                  <Box flex="1">
                    <HStack>
                      <LuMail />
                      <Text fontWeight="medium">{invitation.invitedEmail}</Text>
                      <Badge colorScheme="yellow">{t("members.pending")}</Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600">
                      {t("members.invitedBy")}{" "}
                      {invitation.inviter?.name ||
                        invitation.inviter?.email ||
                        t("members.unknown")}{" "}
                      {t("members.onDate")}{" "}
                      {new Date(invitation.createdAt).toLocaleDateString(
                        "fr-FR",
                      )}
                    </Text>
                  </Box>
                  <HStack>
                    <IconButton
                      aria-label={t("members.copyInvitationAria")}
                      variant="ghost"
                      onClick={() =>
                        handleCopyInvitationLink(invitation.invitationCode)
                      }
                    >
                      <LuCopy />
                    </IconButton>
                    <Form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="cancel-invitation"
                      />
                      <input
                        type="hidden"
                        name="invitationId"
                        value={invitation.id}
                      />
                      <IconButton
                        type="submit"
                        aria-label={t("members.cancelInvitationAria")}
                        variant="ghost"
                        colorScheme="red"
                      >
                        <LuTrash2 />
                      </IconButton>
                    </Form>
                  </HStack>
                </HStack>
              </Card.Body>
            </Card.Root>
          ))}
        </VStack>
      )}

      {/* Dialog d'invitation */}
      <DialogRoot
        open={isInviteDialogOpen}
        onOpenChange={(e) => setIsInviteDialogOpen(e.open)}
      >
        <Portal>
          <DialogBackdrop />
          <DialogPositioner>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("members.invite")}</DialogTitle>
                <DialogCloseTrigger />
              </DialogHeader>
              <DialogBody>
                <Form method="post" id="invite-form">
                  <input type="hidden" name="intent" value="invite-user" />
                  <VStack align="stretch" gap={4}>
                    <Box>
                      <Text mb={2}>{t("members.invite.emailLabel")}</Text>
                      <Input
                        name="email"
                        type="email"
                        placeholder="email@exemple.com"
                        required
                      />
                    </Box>
                  </VStack>
                </Form>
              </DialogBody>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" form="invite-form" colorScheme="brand">
                  {t("members.createInvitation")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogPositioner>
        </Portal>
      </DialogRoot>

      {/* Modale d'affichage du lien en cas d'erreur de copie */}
      <DialogRoot
        open={showLinkModal}
        onOpenChange={(e) => setShowLinkModal(e.open)}
      >
        <Portal>
          <DialogBackdrop />
          <DialogPositioner>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lien d'invitation</DialogTitle>
                <DialogCloseTrigger />
              </DialogHeader>
              <DialogBody>
                <VStack align="stretch" gap={4}>
                  <Text fontSize="sm" color="gray.600">
                    {t("members.inviteLink.copyError")}
                  </Text>
                  <Input
                    value={currentLink}
                    readOnly
                    onClick={(e) => e.currentTarget.select()}
                  />
                </VStack>
              </DialogBody>
              <DialogFooter>
                <Button onClick={() => setShowLinkModal(false)}>Fermer</Button>
              </DialogFooter>
            </DialogContent>
          </DialogPositioner>
        </Portal>
      </DialogRoot>
    </Box>
  );
}
