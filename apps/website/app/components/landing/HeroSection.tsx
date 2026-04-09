import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useColorMode } from "../ui/color-mode";

/**
 * Decorative SVG — circuit-board traces with transistor-pin motifs.
 * Purely visual, no semantic meaning.
 */
function CircuitDecoration() {
  return (
    <Box
      position="absolute"
      inset={0}
      pointerEvents="none"
      overflow="hidden"
      opacity={{ _light: 0.35, _dark: 0.25 }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Horizontal traces */}
        <line
          x1="0"
          y1="100"
          x2="300"
          y2="100"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="350"
          y1="100"
          x2="800"
          y2="100"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="300"
          x2="200"
          y2="300"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="250"
          y1="300"
          x2="550"
          y2="300"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="600"
          y1="300"
          x2="800"
          y2="300"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="100"
          y1="500"
          x2="700"
          y2="500"
          stroke="#87C241"
          strokeWidth="1"
        />

        {/* Vertical traces */}
        <line
          x1="300"
          y1="0"
          x2="300"
          y2="100"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="300"
          y1="100"
          x2="300"
          y2="300"
          stroke="#43AECE"
          strokeWidth="1"
          strokeDasharray="4 8"
        />
        <line
          x1="550"
          y1="300"
          x2="550"
          y2="500"
          stroke="#87C241"
          strokeWidth="1"
        />
        <line
          x1="200"
          y1="300"
          x2="200"
          y2="600"
          stroke="#1569D4"
          strokeWidth="1"
          strokeDasharray="4 8"
        />

        {/* Pin nodes — small circles at intersections like transistor pins */}
        <circle cx="300" cy="100" r="4" fill="#43AECE" />
        <circle cx="200" cy="300" r="4" fill="#1569D4" />
        <circle cx="550" cy="300" r="4" fill="#1569D4" />
        <circle cx="550" cy="500" r="4" fill="#87C241" />
        <circle cx="100" cy="500" r="3" fill="#87C241" />
        <circle cx="700" cy="500" r="3" fill="#87C241" />

        {/* Larger connector pads */}
        <rect
          x="340"
          y="92"
          width="16"
          height="16"
          rx="2"
          fill="none"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <rect
          x="242"
          y="292"
          width="16"
          height="16"
          rx="2"
          fill="none"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <rect
          x="592"
          y="292"
          width="16"
          height="16"
          rx="2"
          fill="none"
          stroke="#1569D4"
          strokeWidth="1"
        />
      </svg>
    </Box>
  );
}

/** Fake translation interface illustration */
function TranslationMockup() {
  return (
    <Box
      position="relative"
      borderRadius="md"
      overflow="hidden"
      bg="surface.panel"
      border="1px solid"
      borderColor="surface.border"
      w="full"
      maxW="md"
      animationName="float"
      animationDuration="4s"
      animationTimingFunction="ease-in-out"
      animationIterationCount="infinite"
    >
      {/* Title bar */}
      <HStack
        bg="surface.panelMuted"
        px={4}
        py={3}
        borderBottom="1px solid"
        borderColor="surface.border"
        gap={2}
      >
        <Box w={2.5} h={2.5} borderRadius="full" bg="accent.solid" />
        <Box w={2.5} h={2.5} borderRadius="full" bg="brand.solid" />
        <Box w={2.5} h={2.5} borderRadius="full" bg="fg.muted" />
        <Box flex={1} />
        <Box
          h={2}
          w="30%"
          borderRadius="sm"
          bg={{ _light: "blackAlpha.100", _dark: "whiteAlpha.100" }}
        />
      </HStack>

      {/* Content */}
      <Box p={4}>
        {/* Header row */}
        <HStack gap={3} mb={4}>
          <Box flex={1} h={2.5} borderRadius="sm" bg="brand.muted" />
          <Box w={16} h={2.5} borderRadius="sm" bg="accent.muted" />
        </HStack>

        {/* Translation rows */}
        {[1, 2, 3].map((row) => (
          <HStack
            key={row}
            gap={3}
            mb={2}
            p={3}
            borderRadius="md"
            bg="surface.panelMuted"
            border="1px solid"
            borderColor="surface.border"
          >
            <Box
              w={1}
              h={6}
              borderRadius="full"
              bg={
                row === 1
                  ? "accent.solid"
                  : row === 2
                    ? "brand.solid"
                    : "fg.subtle"
              }
            />
            <Box w="25%" h={2} borderRadius="sm" bg="fg.subtle" />
            <Box flex={1} h={2} borderRadius="sm" bg="brand.muted" />
            <Box w={8} h={2} borderRadius="sm" bg="accent.muted" />
          </HStack>
        ))}
      </Box>
    </Box>
  );
}

export function HeroSection() {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();

  return (
    <Box
      as="section"
      position="relative"
      overflow="hidden"
      py={{ base: 16, md: 24, lg: 32 }}
    >
      <CircuitDecoration />

      <Container maxW="container.xl" position="relative">
        <Stack
          direction={{ base: "column", lg: "row" }}
          gap={{ base: 12, lg: 20 }}
          align="center"
        >
          <VStack
            flex={1}
            gap={8}
            align={{ base: "center", lg: "flex-start" }}
            textAlign={{ base: "center", lg: "left" }}
            animationName="fade-in, slide-from-bottom"
            animationDuration="600ms"
            animationTimingFunction="ease-out"
          >
            {/* Tag */}
            <HStack
              gap={2}
              px={3}
              py={1.5}
              borderRadius="md"
              border="1px solid"
              borderColor="surface.border"
              bg="surface.panelMuted"
            >
              <img
                src={
                  colorMode === "dark"
                    ? "/logo-square-white.svg"
                    : "/logo-square-black.svg"
                }
                alt="Transi-Store"
                width={18}
                height={18}
              />
              <Text
                fontSize="xs"
                fontWeight="bold"
                letterSpacing="0.15em"
                textTransform="uppercase"
                color="fg.muted"
              >
                Open Source
              </Text>
            </HStack>

            <Heading
              as="h1"
              textStyle={{ base: "4xl", md: "5xl", lg: "6xl" }}
              lineHeight="1.1"
              letterSpacing="tight"
              maxW="2xl"
              fontFamily="heading"
            >
              {t("landing.hero.title")}
            </Heading>

            <Text
              textStyle={{ base: "lg", md: "xl" }}
              color="fg.muted"
              maxW="xl"
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
                <Link to="/auth/login">{t("landing.hero.cta.getStarted")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">{t("landing.hero.cta.viewPricing")}</Link>
              </Button>
            </Stack>
          </VStack>

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
            <TranslationMockup />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
