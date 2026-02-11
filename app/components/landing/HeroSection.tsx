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

function DecorativeUI() {
  return (
    <Box
      borderRadius="xl"
      boxShadow="xl"
      overflow="hidden"
      bg="bg"
      border="1px solid"
      borderColor="border"
      w="full"
      maxW="lg"
      animationName="float"
      animationDuration="3s"
      animationTimingFunction="ease-in-out"
      animationIterationCount="infinite"
    >
      {/* Browser chrome */}
      <Box bg="bg.subtle" px={4} py={3} borderBottom="1px solid" borderColor="border">
        <Stack direction="row" gap={2}>
          <Box w={3} h={3} borderRadius="full" bg="red.400" />
          <Box w={3} h={3} borderRadius="full" bg="yellow.400" />
          <Box w={3} h={3} borderRadius="full" bg="green.400" />
        </Stack>
      </Box>

      {/* Fake translation UI */}
      <Box p={4}>
        {/* Header row */}
        <Stack direction="row" gap={3} mb={4}>
          <Box flex={1} h={3} borderRadius="sm" bg="brand.muted" />
          <Box w={20} h={3} borderRadius="sm" bg="accent.muted" />
        </Stack>

        {/* Translation rows */}
        {[1, 2, 3, 4].map((row) => (
          <Stack
            key={row}
            direction="row"
            gap={3}
            mb={3}
            p={3}
            borderRadius="md"
            bg="bg.subtle"
            align="center"
          >
            <Box w="30%" h={2.5} borderRadius="sm" bg="fg.subtle" />
            <Box flex={1} h={2.5} borderRadius="sm" bg="brand.muted" opacity={0.7 + row * 0.075} />
            <Box w={8} h={2.5} borderRadius="sm" bg="accent.muted" />
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <Box
      as="section"
      py={{ base: 12, md: 20, lg: 28 }}
      bg={{ base: "brand.subtle", _dark: "brand.subtle" }}
    >
      <Container maxW="container.xl">
        <Stack
          direction={{ base: "column", lg: "row" }}
          gap={{ base: 10, lg: 16 }}
          align="center"
        >
          {/* Text content */}
          <VStack
            flex={1}
            gap={6}
            align={{ base: "center", lg: "flex-start" }}
            textAlign={{ base: "center", lg: "left" }}
            animationName="fade-in, slide-from-bottom"
            animationDuration="600ms"
            animationTimingFunction="ease-out"
          >
            <Heading
              as="h1"
              textStyle={{ base: "3xl", md: "4xl", lg: "5xl" }}
              lineHeight="tight"
            >
              {t("landing.hero.title")}
            </Heading>
            <Text textStyle={{ base: "lg", md: "xl" }} color="fg.muted" maxW="xl">
              {t("landing.hero.subtitle")}
            </Text>

            <Stack
              direction={{ base: "column", sm: "row" }}
              gap={4}
              w={{ base: "full", sm: "auto" }}
            >
              <Button asChild size="lg" colorPalette="brand">
                <Link to="/auth/login">
                  {t("landing.hero.cta.getStarted")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">
                  {t("landing.hero.cta.viewPricing")}
                </Link>
              </Button>
            </Stack>
          </VStack>

          {/* Decorative illustration */}
          <Box
            flex={1}
            display={{ base: "none", md: "flex" }}
            justifyContent="center"
            animationName="fade-in, slide-from-right"
            animationDuration="600ms"
            animationTimingFunction="ease-out"
            animationDelay="200ms"
            animationFillMode="backwards"
          >
            <DecorativeUI />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
