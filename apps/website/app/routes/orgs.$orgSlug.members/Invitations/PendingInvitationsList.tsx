import { VStack, Heading } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { PendingInvitationItem } from "./PendingInvitationItem";
import type { PendingInvitation } from "~/lib/invitations.server";

type PendingInvitationsListProps = {
  invitations: Array<PendingInvitation>;
  onCopyLink: (code: string) => void;
};

export function PendingInvitationsList({
  invitations,
  onCopyLink,
}: PendingInvitationsListProps) {
  const { t } = useTranslation();

  if (invitations.length === 0) {
    return null;
  }

  return (
    <VStack align="stretch" gap={4}>
      <Heading as="h3" size="md">
        {t("members.pendingTitle", { count: invitations.length })}
      </Heading>
      {invitations.map((invitation) => (
        <PendingInvitationItem
          key={invitation.id}
          invitation={invitation}
          onCopyLink={onCopyLink}
        />
      ))}
    </VStack>
  );
}
