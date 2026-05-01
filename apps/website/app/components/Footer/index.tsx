import { Box, Container, HStack, Text, VStack } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <Box
      as="footer"
      borderTop="1px solid"
      borderColor="surface.border"
      py={8}
      mt={16}
    >
      <Container maxW="container.xl">
        <VStack gap={4} align={{ base: "center", md: "stretch" }}>
          <HStack
            justify={{ base: "center", md: "space-between" }}
            flexWrap="wrap"
            gap={4}
          >
            <Text color="fg.muted" textStyle="sm">
              {t("footer.tagline")}
            </Text>

            <HStack as="nav" gap={4} flexWrap="wrap" justify="center">
              <Link to="/docs/usage">
                <Text textStyle="sm" color="fg.muted" _hover={{ color: "fg" }}>
                  {t("header.docs")}
                </Text>
              </Link>
              <Link to="/api/doc">
                <Text textStyle="sm" color="fg.muted" _hover={{ color: "fg" }}>
                  {t("header.api-doc")}
                </Text>
              </Link>
              <Link to="/pricing">
                <Text textStyle="sm" color="fg.muted" _hover={{ color: "fg" }}>
                  {t("header.pricing")}
                </Text>
              </Link>
              <a
                href="https://github.com/transi-store/transi-store"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Text textStyle="sm" color="fg.muted" _hover={{ color: "fg" }}>
                  GitHub
                </Text>
              </a>
            </HStack>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}
