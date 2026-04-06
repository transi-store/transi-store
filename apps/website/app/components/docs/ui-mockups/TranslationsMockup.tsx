import { Box, Stack, Text } from "@chakra-ui/react";
import { TranslationsTable } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsTable";
import type { RegularDataRow } from "~/lib/translation-helper";

const SAMPLE_KEYS: RegularDataRow[] = [
  {
    id: 1,
    projectId: 1,
    branchId: null,
    keyName: "common.save",
    description: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    defaultTranslation: "Save",
    translatedLocales: ["fr", "de", "es"],
  },
  {
    id: 2,
    projectId: 1,
    branchId: null,
    keyName: "common.cancel",
    description: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    defaultTranslation: "Cancel",
    translatedLocales: ["fr", "de"],
  },
  {
    id: 3,
    projectId: 1,
    branchId: null,
    keyName: "checkout.title",
    description: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    defaultTranslation: "Checkout",
    translatedLocales: ["fr"],
  },
  {
    id: 4,
    projectId: 1,
    branchId: null,
    keyName: "checkout.confirm_button",
    description: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    defaultTranslation: "Confirm order",
    translatedLocales: [],
  },
];

export function TranslationsMockup() {
  return (
    <Box
      borderRadius="xl"
      overflow="hidden"
      border="1px solid"
      borderColor="border"
      bg="bg"
      boxShadow="md"
      my={6}
    >
      {/* Browser chrome */}
      <Box
        bg="bg.subtle"
        px={4}
        py={2}
        borderBottom="1px solid"
        borderColor="border"
      >
        <Stack direction="row" gap={2} align="center">
          <Box w={3} h={3} borderRadius="full" bg="red.400" />
          <Box w={3} h={3} borderRadius="full" bg="yellow.400" />
          <Box w={3} h={3} borderRadius="full" bg="green.400" />
          <Box
            flex={1}
            mx={4}
            px={3}
            py={1}
            bg="bg"
            borderRadius="md"
            border="1px solid"
            borderColor="border"
          >
            <Text fontSize="xs" color="fg.muted" fontFamily="mono">
              transi-store.com/orgs/acme/projects/webapp/translations
            </Text>
          </Box>
        </Stack>
      </Box>

      {/* Real TranslationsTable component with sample data — non-interactive */}
      <Box pointerEvents="none">
        <TranslationsTable
          data={SAMPLE_KEYS}
          totalLanguages={3}
          organizationSlug="acme"
          projectSlug="webapp"
          currentUrl="/orgs/acme/projects/webapp/translations"
          onEditInDrawer={() => {}}
        />
      </Box>
    </Box>
  );
}
