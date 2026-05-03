import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { CircuitDecoration } from "~/components/CircuitDecoration";
import { LocalizedLink } from "~/components/LocalizedLink";
import { NEON_TEAL } from "./neon-colors";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <Box
      as="section"
      position="relative"
      overflow="hidden"
      py={{ base: 16, md: 24, lg: 32 }}
    >
      <CircuitDecoration />

      <Container maxW="container.xl" position="relative">
        <VStack
          gap={8}
          align="center"
          textAlign="center"
          animationName="fade-in, slide-from-bottom"
          animationDuration="600ms"
          animationTimingFunction="ease-out"
        >
          <Badge
            variant="outline"
            colorPalette="teal"
            size="lg"
            px={3}
            py={1}
            borderRadius="full"
            fontSize="sm"
            fontFamily="mono"
            letterSpacing="wide"
            borderColor={NEON_TEAL}
            color={NEON_TEAL}
            boxShadow={`0 0 8px ${NEON_TEAL}40`}
          >
            {t("landing.hero.devBadge")}
          </Badge>

          <Heading
            as="h1"
            textStyle={{ base: "4xl", md: "5xl", lg: "6xl" }}
            lineHeight="1.1"
            letterSpacing="tight"
            maxW="3xl"
            fontFamily="heading"
          >
            {t("landing.hero.title")}
          </Heading>

          <Text
            textStyle={{ base: "lg", md: "xl" }}
            color="fg.muted"
            maxW="2xl"
            lineHeight="tall"
          >
            {t("landing.hero.subtitle")}
          </Text>

          <Stack
            direction={{ base: "column", sm: "row" }}
            gap={3}
            w={{ base: "full", sm: "auto" }}
          >
            <Button asChild size="lg" colorPalette="accent" fontWeight="bold">
              <LocalizedLink to="/auth/login">
                {t("landing.hero.cta.getStarted")}
              </LocalizedLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <LocalizedLink to="/pricing">
                {t("landing.hero.cta.viewPricing")}
              </LocalizedLink>
            </Button>
          </Stack>
        </VStack>
      </Container>
    </Box>
  );
}
