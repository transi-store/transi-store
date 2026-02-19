import { Box, Text, VStack, Heading } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import type { ImportStats } from "~/lib/import/json.server";

type ImportResultsProps = {
  importStats?: ImportStats;
};

export function ImportResults({ importStats }: ImportResultsProps) {
  const { t } = useTranslation();

  if (importStats) {
    return (
      <Box
        p={4}
        bg="green.subtle"
        borderRadius="md"
        borderWidth={1}
        borderColor="green.200"
        mt={4}
      >
        <Heading as="h4" size="sm" color="green.fg" mb={2}>
          {t("import.success.title")}
        </Heading>
        <VStack gap={1} align="stretch" fontSize="sm" color="green.fg">
          <Text>
            • {t("import.stats.total")}: {importStats.total}{" "}
            {t("import.stats.entries")}
          </Text>
          <Text>
            • {t("import.stats.keysCreated")}: {importStats.keysCreated}
          </Text>
          <Text>
            • {t("import.stats.translationsCreated")}:{" "}
            {importStats.translationsCreated}
          </Text>
          <Text>
            • {t("import.stats.translationsUpdated")}:{" "}
            {importStats.translationsUpdated}
          </Text>
          <Text>
            • {t("import.stats.translationsSkipped")}:{" "}
            {importStats.translationsSkipped}
          </Text>
        </VStack>
      </Box>
    );
  }

  return null;
}
