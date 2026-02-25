import { VStack, Heading, HStack, Box, Button } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { LuPlus } from "react-icons/lu";
import { useCopyInvitationLink } from "./useCopyInvitationLink";
import { NewInvitationAlert } from "./NewInvitationAlert";
import { OrganizationInviteLink } from "./OrganizationInviteLink";
import { PendingInvitationsList } from "./PendingInvitationsList";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { CopyLinkFallbackDialog } from "./CopyLinkFallbackDialog";
import type { OrganizationInvitation } from "../../../../drizzle/schema";
import type { PendingInvitation } from "~/lib/invitations.server";

type InvitationsProps = {
  organizationInvitation: OrganizationInvitation | null;
  pendingInvitations: Array<PendingInvitation>;
  origin: string;
  newInvitationCode?: string;
  actionError?: string;
};

export default function Invitations({
  organizationInvitation,
  pendingInvitations,
  origin,
  newInvitationCode,
  actionError,
}: InvitationsProps) {
  const { t } = useTranslation();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const { handleCopy, showFallbackModal, fallbackLink, closeFallbackModal } =
    useCopyInvitationLink(origin);

  // Fermer la modale après création réussie (adjusting state based on prop)
  const [prevNewInvitationCode, setPrevNewInvitationCode] =
    useState(newInvitationCode);
  if (newInvitationCode !== prevNewInvitationCode) {
    setPrevNewInvitationCode(newInvitationCode);
    if (newInvitationCode) {
      setIsInviteDialogOpen(false);
    }
  }

  return (
    <>
      {/* Header avec bouton d'invitation */}
      <HStack justify="space-between" mb={6}>
        <Heading as="h2" size="lg">
          {t("members.title")}
        </Heading>
        <Button
          colorPalette="brand"
          onClick={() => setIsInviteDialogOpen(true)}
        >
          <LuPlus /> {t("members.invite")}
        </Button>
      </HStack>

      {/* Erreur éventuelle */}
      {actionError && (
        <Box mb={4} p={3} bg="red.50" borderRadius="md" color="red.fg">
          {actionError}
        </Box>
      )}

      {/* Affichage du lien d'invitation après création */}
      {newInvitationCode && (
        <NewInvitationAlert
          invitationCode={newInvitationCode}
          origin={origin}
          onCopyLink={handleCopy}
        />
      )}

      {/* Lien d'invitation pour l'organisation */}
      <VStack align="stretch" gap={4} mb={8}>
        <Heading as="h3" size="md">
          {t("members.inviteLink.title")}
        </Heading>
        <OrganizationInviteLink
          invitation={organizationInvitation}
          origin={origin}
          onCopyLink={handleCopy}
        />
      </VStack>

      {/* Invitations en attente */}
      <PendingInvitationsList
        invitations={pendingInvitations}
        onCopyLink={handleCopy}
      />

      {/* Dialog d'invitation par email */}
      <InviteMemberDialog
        isOpen={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />

      {/* Modale de fallback pour copier le lien */}
      <CopyLinkFallbackDialog
        isOpen={showFallbackModal}
        link={fallbackLink}
        onClose={closeFallbackModal}
      />
    </>
  );
}
