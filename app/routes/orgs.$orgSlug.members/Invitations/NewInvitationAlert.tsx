import { Alert, VStack, HStack, Text, Code, Button } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { LuCopy, LuTriangleAlert } from "react-icons/lu";

type NewInvitationAlertProps = {
  invitationCode: string;
  origin: string;
  onCopyLink: (code: string) => void;
};

export function NewInvitationAlert({
  invitationCode,
  origin,
  onCopyLink,
}: NewInvitationAlertProps) {
  const { t } = useTranslation();

  return (
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
                {origin}/orgs/invite/{invitationCode}
              </Code>
              <Button
                size="sm"
                onClick={() => onCopyLink(invitationCode)}
                colorPalette="gray"
              >
                <LuCopy /> {t("members.copy")}
              </Button>
            </HStack>
          </VStack>
        </Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}
