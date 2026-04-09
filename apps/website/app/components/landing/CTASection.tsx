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
    <Box as="section" py={{ base: 12, md: 20 }} px={{ base: 3, md: 4 }}>
      <Container maxW="container.xl">
        <Box
          position="relative"
          overflow="hidden"
          borderRadius="4xl"
          bgGradient={{
            _light: "linear(to-r, gray.950, blue.950)",
            _dark: "linear(to-r, #070b12, #0f1b2d)",
          }}
          color="white"
          border="1px solid"
          borderColor="surface.border"
          px={{ base: 6, md: 10 }}
          py={{ base: 8, md: 12 }}
        >
          <Box
            position="absolute"
            inset={0}
            bgImage="repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 96px)"
            opacity={0.5}
          />
          <VStack gap={6} textAlign="center" position="relative">
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

            <Stack direction={{ base: "column", sm: "row" }} gap={4} mt={4}>
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
        </Box>
      </Container>
    </Box>
  );
}
