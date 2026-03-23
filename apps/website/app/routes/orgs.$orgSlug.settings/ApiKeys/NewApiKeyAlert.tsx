import { Alert, Code, HStack, Button, VStack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { LuTriangleAlert, LuCopy } from "react-icons/lu";

type NewApiKeyAlertProps = {
  keyValue: string;
  onCopyKey: (key: string) => void;
};

export function NewApiKeyAlert({ keyValue, onCopyKey }: NewApiKeyAlertProps) {
  const { t } = useTranslation();

  return (
    <Alert.Root status="success" mb={4}>
      <Alert.Indicator>
        <LuTriangleAlert />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Title>{t("settings.apiKeys.createdTitle")}</Alert.Title>
        <Alert.Description>
          <VStack align="stretch" gap={2} mt={2}>
            <HStack>
              <Code
                p={2}
                borderRadius="md"
                fontSize="sm"
                flex={1}
                wordBreak="break-all"
              >
                {keyValue}
              </Code>
              <Button
                size="sm"
                onClick={() => onCopyKey(keyValue)}
                colorPalette="gray"
              >
                <LuCopy /> {t("settings.copy")}
              </Button>
            </HStack>
          </VStack>
        </Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}
