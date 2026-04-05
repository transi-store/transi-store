import { Badge, Box, HStack, Stack, Text, VStack } from "@chakra-ui/react";

const SAMPLE_KEYS = [
  {
    key: "common.save",
    en: "Save",
    fr: "Enregistrer",
    de: "Speichern",
    status: "complete",
  },
  {
    key: "common.cancel",
    en: "Cancel",
    fr: "Annuler",
    de: "Abbrechen",
    status: "complete",
  },
  {
    key: "checkout.title",
    en: "Checkout",
    fr: "Paiement",
    de: "",
    status: "partial",
  },
  {
    key: "checkout.confirm",
    en: "Confirm order",
    fr: "",
    de: "",
    status: "missing",
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
              transi-store.io/orgs/acme/projects/webapp/translations
            </Text>
          </Box>
        </Stack>
      </Box>

      {/* Table header */}
      <Box px={4} pt={3} pb={2} borderBottom="1px solid" borderColor="border">
        <HStack gap={0}>
          <Box w="30%" px={2}>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="fg.muted"
              textTransform="uppercase"
            >
              Key
            </Text>
          </Box>
          <Box flex={1} px={2}>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="fg.muted"
              textTransform="uppercase"
            >
              English
            </Text>
          </Box>
          <Box flex={1} px={2}>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="fg.muted"
              textTransform="uppercase"
            >
              French
            </Text>
          </Box>
          <Box flex={1} px={2}>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="fg.muted"
              textTransform="uppercase"
            >
              German
            </Text>
          </Box>
          <Box w={20} px={2} />
        </HStack>
      </Box>

      {/* Rows */}
      <VStack gap={0} align="stretch">
        {SAMPLE_KEYS.map((row, i) => (
          <Box
            key={row.key}
            px={4}
            py={2.5}
            borderBottom={i < SAMPLE_KEYS.length - 1 ? "1px solid" : "none"}
            borderColor="border"
            _hover={{ bg: "bg.subtle" }}
          >
            <HStack gap={0} align="center">
              <Box w="30%" px={2}>
                <Text fontSize="sm" fontFamily="mono" color="fg.muted">
                  {row.key}
                </Text>
              </Box>
              <Box flex={1} px={2}>
                <Text fontSize="sm">{row.en || ""}</Text>
              </Box>
              <Box flex={1} px={2}>
                <Text
                  fontSize="sm"
                  color={row.fr ? "fg" : "fg.subtle"}
                  fontStyle={row.fr ? "normal" : "italic"}
                >
                  {row.fr || "—"}
                </Text>
              </Box>
              <Box flex={1} px={2}>
                <Text
                  fontSize="sm"
                  color={row.de ? "fg" : "fg.subtle"}
                  fontStyle={row.de ? "normal" : "italic"}
                >
                  {row.de || "—"}
                </Text>
              </Box>
              <Box w={20} px={2}>
                <Badge
                  size="sm"
                  colorPalette={
                    row.status === "complete"
                      ? "green"
                      : row.status === "partial"
                        ? "yellow"
                        : "red"
                  }
                >
                  {row.status}
                </Badge>
              </Box>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
