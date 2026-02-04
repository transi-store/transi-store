import {
  Alert,
  VStack,
  HStack,
  Text,
  Code,
  Button,
  Card,
} from "@chakra-ui/react";
import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPlus, LuCopy, LuTrash2 } from "react-icons/lu";
import type { OrganizationInvitation } from "../../../../drizzle/schema";

type OrganizationInviteLinkProps = {
  invitation: OrganizationInvitation | null;
  origin: string;
  onCopyLink: (code: string) => void;
};

export function OrganizationInviteLink({
  invitation,
  origin,
  onCopyLink,
}: OrganizationInviteLinkProps) {
  const { t } = useTranslation();

  if (invitation) {
    return (
      <Alert.Root status="info">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t("members.inviteLink.permanentTitle")}</Alert.Title>
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
                  {origin}/orgs/invite/{invitation.invitationCode}
                </Code>
                <Button
                  size="sm"
                  onClick={() => onCopyLink(invitation.invitationCode)}
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
                    value={invitation.id}
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
    );
  }

  return (
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
              • <strong>{t("members.inviteLink.emailInviteLabel")}</strong>{" "}
              {t("members.inviteLink.emailInviteDesc")}
            </Text>
          </VStack>
          <Form method="post">
            <input type="hidden" name="intent" value="create-org-invitation" />
            <Button type="submit" colorScheme="brand" mt={2}>
              <LuPlus /> {t("members.createOrgInvitation")}
            </Button>
          </Form>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
