import { Box, Text, Code, HStack, IconButton, Button } from "@chakra-ui/react";
import { Form } from "react-router";
import { useTranslation } from "react-i18next";
import { LuCopy, LuTrash2 } from "react-icons/lu";
import type { ApiKey } from "../../../../drizzle/schema";

type ApiKeyItemProps = {
  apiKey: ApiKey;
  onCopyKey: (key: string) => void;
};

export function ApiKeyItem({ apiKey, onCopyKey }: ApiKeyItemProps) {
  const { t } = useTranslation();

  return (
    <Box p={4} borderWidth={1} borderRadius="md">
      <HStack justify="space-between">
        <Box flex={1}>
          <Text fontWeight="medium">
            {apiKey.name || t("settings.apiKeys.unnamedKey")}
          </Text>

          <HStack>
            <Code
              p={2}
              borderRadius="md"
              fontSize="sm"
              flex={1}
              wordBreak="break-all"
            >
              {apiKey.keyValue}
            </Code>
            <Button
              size="sm"
              onClick={() => onCopyKey(apiKey.keyValue)}
              colorPalette="gray"
            >
              <LuCopy /> {t("members.copy")}
            </Button>
          </HStack>

          <Text fontSize="sm" color="fg.muted">
            {t("settings.apiKeys.createdOn")}{" "}
            {new Date(apiKey.createdAt).toLocaleDateString()}
            {apiKey.lastUsedAt && (
              <>
                {" • "}
                {t("settings.apiKeys.lastUsed")}{" "}
                {new Date(apiKey.lastUsedAt).toLocaleDateString()}
              </>
            )}
          </Text>
        </Box>
        <Form method="post">
          <input type="hidden" name="intent" value="delete-api-key" />
          <input type="hidden" name="keyId" value={apiKey.id} />
          <IconButton
            type="submit"
            variant="ghost"
            colorPalette="red"
            size="sm"
            aria-label={t("settings.apiKeys.deleteAria")}
            title={t("settings.apiKeys.deleteTitle")}
          >
            <LuTrash2 />
          </IconButton>
        </Form>
      </HStack>
    </Box>
  );
}
