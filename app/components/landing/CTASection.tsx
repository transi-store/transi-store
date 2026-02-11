import {
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function CTASection() {
  const { t } = useTranslation();

  return (
    <Box as="section" py={{ base: 12, md: 20 }} bg="brand.solid" color="white">
      <Container maxW="container.xl">
        <VStack gap={6} textAlign="center">
          <Heading
            as="h2"
            textStyle={{ base: "2xl", md: "4xl" }}
            color="white"
          >
            {t("landing.cta.title")}
          </Heading>
          <Text textStyle="lg" color="whiteAlpha.800" maxW="2xl">
            {t("landing.cta.subtitle")}
          </Text>

          <Stack
            direction={{ base: "column", sm: "row" }}
            gap={4}
            mt={4}
          >
            <Button
              asChild
              size="lg"
              bg="white"
              color="brand.solid"
              _hover={{ bg: "whiteAlpha.900" }}
            >
              <Link to="/auth/login">{t("landing.cta.getStarted")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              borderColor="whiteAlpha.600"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
            >
              <Link to="/pricing">{t("landing.cta.viewPricing")}</Link>
            </Button>
          </Stack>
        </VStack>
      </Container>
    </Box>
  );
}
