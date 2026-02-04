import { Box, HStack, Card, Badge, Text, IconButton } from "@chakra-ui/react";
import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuMail, LuCopy, LuTrash2 } from "react-icons/lu";
import type { PendingInvitation } from "~/lib/invitations.server";

type PendingInvitationItemProps = {
  invitation: PendingInvitation;
  onCopyLink: (code: string) => void;
};

export function PendingInvitationItem({
  invitation,
  onCopyLink,
}: PendingInvitationItemProps) {
  const { t } = useTranslation();

  return (
    <Card.Root>
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
              {new Date(invitation.createdAt).toLocaleDateString("fr-FR")}
            </Text>
          </Box>
          <HStack>
            <IconButton
              aria-label={t("members.copyInvitationAria")}
              variant="ghost"
              onClick={() => onCopyLink(invitation.invitationCode)}
            >
              <LuCopy />
            </IconButton>
            <Form method="post">
              <input type="hidden" name="intent" value="cancel-invitation" />
              <input type="hidden" name="invitationId" value={invitation.id} />
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
  );
}
