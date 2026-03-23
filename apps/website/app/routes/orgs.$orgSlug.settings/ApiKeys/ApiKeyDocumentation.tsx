import { Box, Heading, Text, Code } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

type ApiKeyDocumentationProps = {
  organizationSlug: string;
  origin: string;
};

export function ApiKeyDocumentation({
  organizationSlug,
  origin,
}: ApiKeyDocumentationProps) {
  const { t } = useTranslation();

  return (
    <Box mt={6} p={4} borderWidth={1} borderRadius="lg" bg="bg.subtle">
      <Heading as="h4" size="sm" mb={2}>
        {t("settings.apiKeys.howToUse")}
      </Heading>
      <Text fontSize="sm" color="fg" mb={2}>
        {t("settings.apiKeys.howToUseDescription")}
        <Code>Authorization: Bearer YOUR_API_KEY</Code>{" "}
        {t("settings.apiKeys.howToUseDescription2")}
      </Text>
      <Code
        display="block"
        p={3}
        borderRadius="md"
        fontSize="xs"
        whiteSpace="pre-wrap"
        wordBreak="break-all"
      >
        {`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${origin}/api/orgs/${organizationSlug}/projects/PROJECT_SLUG/export?format=json&locale=fr"`}
      </Code>
    </Box>
  );
}
