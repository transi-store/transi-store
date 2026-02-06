import { Box, Text, VStack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { ApiKeyItem } from "./ApiKeyItem";
import type { ApiKey } from "../../../../drizzle/schema";

type ApiKeysListProps = {
  apiKeys: Array<ApiKey>;
  newKeyValue?: string;
  onCopyKey: (key: string) => void;
};

export function ApiKeysList({
  apiKeys,
  newKeyValue,
  onCopyKey,
}: ApiKeysListProps) {
  const { t } = useTranslation();

  // Filtrer la clé qui vient d'être créée de la liste
  const existingKeys = apiKeys.filter((key) => key.keyValue !== newKeyValue);

  if (existingKeys.length === 0) {
    return (
      <Box p={6} textAlign="center" borderWidth={1} borderRadius="lg" mb={4}>
        <Text color="fg.muted" mb={3}>
          {t("settings.apiKeys.none")}
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" gap={2}>
      {existingKeys.map((key) => (
        <ApiKeyItem key={key.id} apiKey={key} onCopyKey={onCopyKey} />
      ))}
    </VStack>
  );
}
