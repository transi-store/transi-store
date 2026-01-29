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

export async function action({ request, params }: Route.ActionArgs) {
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
      return { success: false, error: "Email invalide" };
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
            : "Erreur lors de la création de l'invitation",
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
            : "Erreur lors de la création du lien d'invitation",
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
            : "Erreur lors de l'annulation de l'invitation",
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
            : "Erreur lors de la suppression du membre",
      };
    }
  }

  return { success: false, error: "Action invalide" };
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

  // Déterminer l'origine à partir de la requête pour le rendu côté serveur
  const url = new URL(request.url);
  const origin = url.origin;

  return {
    members,
    pendingInvitations,
    organizationInvitation,
    organization,
    origin,
  };
}

export default function OrganizationMembers() {
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
        title: "Lien copié",
        description: "Le lien d'invitation a été copié dans le presse-papiers",
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
          Membres de l'organisation
        </Heading>
        <Button colorScheme="brand" onClick={() => setIsInviteDialogOpen(true)}>
          <LuPlus /> Inviter un membre
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
            <Alert.Title>Invitation créée avec succès</Alert.Title>
            <Alert.Description>
              <VStack align="stretch" gap={2} mt={2}>
                <Text fontSize="sm">
                  Partagez ce lien avec la personne à inviter :
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
                    {actionData.invitationCode}
                  </Code>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleCopyInvitationLink(actionData.invitationCode!)
                    }
                    colorPalette="gray"
                  >
                    <LuCopy /> Copier
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
          Lien d'invitation pour l'organisation
        </Heading>

        {organizationInvitation ? (
          <Alert.Root status="info">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                Lien d'invitation permanent pour l'organisation
              </Alert.Title>
              <Alert.Description>
                <VStack align="stretch" gap={2} mt={2}>
                  <Text fontSize="sm">
                    Ce lien peut être utilisé plusieurs fois par différentes
                    personnes pour rejoindre l'organisation. Il ne périme pas
                    après utilisation.
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
                      <LuCopy /> Copier
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
                        <LuTrash2 /> Supprimer
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
                  Créez un lien d'invitation permanent qui peut être utilisé par
                  plusieurs personnes pour rejoindre l'organisation.
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  Différences avec l'invitation par email :
                </Text>
                <VStack align="stretch" gap={1} pl={4}>
                  <Text fontSize="sm" color="gray.600">
                    • <strong>Lien d'organisation :</strong> Peut être utilisé
                    indéfiniment, pas lié à un email spécifique
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    • <strong>Invitation par email :</strong> Usage unique, liée
                    à un email précis
                  </Text>
                </VStack>
                <Form method="post">
                  <input
                    type="hidden"
                    name="intent"
                    value="create-org-invitation"
                  />
                  <Button type="submit" colorScheme="brand" mt={2}>
                    <LuPlus /> Créer un lien d'invitation pour l'organisation
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
          Membres ({members.length})
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
                      <Badge colorScheme="blue">Vous</Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    {member.user.email}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Membre depuis le{" "}
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
                      aria-label="Retirer le membre"
                      variant="ghost"
                      colorScheme="red"
                      onClick={(e) => {
                        if (
                          !confirm(
                            "Êtes-vous sûr de vouloir retirer ce membre ?",
                          )
                        ) {
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
            Invitations en attente ({pendingInvitations.length})
          </Heading>
          {pendingInvitations.map((invitation) => (
            <Card.Root key={invitation.id}>
              <Card.Body>
                <HStack justify="space-between">
                  <Box flex="1">
                    <HStack>
                      <LuMail />
                      <Text fontWeight="medium">{invitation.invitedEmail}</Text>
                      <Badge colorScheme="yellow">En attente</Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600">
                      Invité par{" "}
                      {invitation.inviter?.name ||
                        invitation.inviter?.email ||
                        "Inconnu"}{" "}
                      le{" "}
                      {new Date(invitation.createdAt).toLocaleDateString(
                        "fr-FR",
                      )}
                    </Text>
                  </Box>
                  <HStack>
                    <IconButton
                      aria-label="Copier le lien d'invitation"
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
                        aria-label="Annuler l'invitation"
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
                <DialogTitle>Inviter un membre</DialogTitle>
                <DialogCloseTrigger />
              </DialogHeader>
              <DialogBody>
                <Form method="post" id="invite-form">
                  <input type="hidden" name="intent" value="invite-user" />
                  <VStack align="stretch" gap={4}>
                    <Box>
                      <Text mb={2}>Email de la personne à inviter :</Text>
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
                  Annuler
                </Button>
                <Button type="submit" form="invite-form" colorScheme="brand">
                  Créer l'invitation
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
                    Impossible de copier automatiquement. Veuillez copier ce
                    lien manuellement :
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
