import {
  Badge,
  Box,
  HStack,
  Progress,
  Stack,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuCopy, LuPanelRightOpen } from "react-icons/lu";

const SAMPLE_KEYS = [
  {
    key: "common.save",
    defaultTranslation: "Save",
    translatedLocales: ["fr", "de", "es"],
    totalLanguages: 3,
  },
  {
    key: "common.cancel",
    defaultTranslation: "Cancel",
    translatedLocales: ["fr", "de"],
    totalLanguages: 3,
  },
  {
    key: "checkout.title",
    defaultTranslation: "Checkout",
    translatedLocales: ["fr"],
    totalLanguages: 3,
  },
  {
    key: "checkout.confirm_button",
    defaultTranslation: "Confirm order",
    translatedLocales: [],
    totalLanguages: 3,
  },
];

function TranslationProgress({
  translatedCount,
  totalLanguages,
  translatedLocales,
}: {
  translatedCount: number;
  totalLanguages: number;
  translatedLocales: string[];
}) {
  const progressPercent =
    totalLanguages > 0 ? (translatedCount / totalLanguages) * 100 : 0;

  return (
    <VStack align="stretch" gap={2}>
      <HStack justify="space-between" fontSize="sm">
        <Text color="fg.muted">
          {translatedCount}/{totalLanguages}
        </Text>
        <Text color="fg.muted">{Math.round(progressPercent)}%</Text>
      </HStack>
      <Progress.Root value={progressPercent} size="sm" colorPalette="brand">
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
      {translatedLocales.length > 0 && (
        <HStack gap={1} flexWrap="wrap">
          {translatedLocales.map((locale) => (
            <Badge key={locale} size="sm" colorPalette="brand">
              {locale.toUpperCase()}
            </Badge>
          ))}
        </HStack>
      )}
    </VStack>
  );
}

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

      {/* Translations table matching the actual UI */}
      <Table.Root variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Key name</Table.ColumnHeader>
            <Table.ColumnHeader maxW="300px">
              Default translation
            </Table.ColumnHeader>
            <Table.ColumnHeader w="160px">Translations</Table.ColumnHeader>
            <Table.ColumnHeader w="200px">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {SAMPLE_KEYS.map((row) => (
            <Table.Row key={row.key}>
              <Table.Cell>
                <HStack gap={2}>
                  <Text
                    fontFamily="mono"
                    fontSize="sm"
                    fontWeight="medium"
                    wordBreak="break-all"
                  >
                    {row.key}
                  </Text>
                  <Box color="fg.subtle" cursor="pointer">
                    <LuCopy size={14} />
                  </Box>
                </HStack>
              </Table.Cell>
              <Table.Cell maxW="300px">
                <Text
                  fontSize="sm"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {row.defaultTranslation}
                </Text>
              </Table.Cell>
              <Table.Cell w="160px">
                <TranslationProgress
                  translatedCount={row.translatedLocales.length}
                  totalLanguages={row.totalLanguages}
                  translatedLocales={row.translatedLocales}
                />
              </Table.Cell>
              <Table.Cell w="200px">
                <HStack gap={2}>
                  <Box
                    px={2}
                    py={1}
                    bg="brand.solid"
                    color="white"
                    borderRadius="md"
                    fontSize="xs"
                    fontWeight="semibold"
                    cursor="pointer"
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <LuPanelRightOpen size={12} /> Edit
                  </Box>
                  <Box
                    px={2}
                    py={1}
                    border="1px solid"
                    borderColor="border"
                    borderRadius="md"
                    fontSize="xs"
                    cursor="pointer"
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <LuCopy size={12} /> Duplicate
                  </Box>
                </HStack>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
