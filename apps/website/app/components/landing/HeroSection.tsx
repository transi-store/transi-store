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
import { useColorMode } from "../ui/color-mode";

function DecorativeUI() {
  return (
    <Box
      position="relative"
      borderRadius="3xl"
      boxShadow={{
        base: "0 32px 60px rgba(15, 23, 42, 0.16)",
        _dark: "0 36px 64px rgba(0, 0, 0, 0.34)",
      }}
      overflow="hidden"
      bg="surface.panel"
      border="1px solid"
      borderColor="surface.border"
      w="full"
      maxW="lg"
      animationName="float"
      animationDuration="3s"
      animationTimingFunction="ease-in-out"
      animationIterationCount="infinite"
      _before={{
        content: '""',
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        bgImage:
          "linear-gradient(135deg, rgba(59,130,246,0.14), transparent 35%), repeating-linear-gradient(90deg, rgba(148,163,184,0.12) 0, rgba(148,163,184,0.12) 1px, transparent 1px, transparent 72px)",
      }}
    >
      <Box
        bg="surface.panelMuted"
        px={5}
        py={4}
        borderBottom="1px solid"
        borderColor="surface.border"
      >
        <Stack direction="row" gap={3} align="center" justify="space-between">
          <Stack direction="row" gap={2}>
            <Box w={3} h={3} borderRadius="full" bg="accent.solid" />
            <Box w={3} h={3} borderRadius="full" bg="brand.solid" />
            <Box w={3} h={3} borderRadius="full" bg="fg.muted" />
          </Stack>
          <Box
            h={2}
            w="40%"
            borderRadius="full"
            bg={{ _light: "blackAlpha.200", _dark: "whiteAlpha.200" }}
          />
        </Stack>
      </Box>

      <Box p={5} position="relative">
        <Stack direction="row" gap={3} mb={5} align="center">
          <Box flex={1} h={3} borderRadius="sm" bg="brand.muted" />
          <Box w={20} h={3} borderRadius="sm" bg="accent.muted" />
          <Box w={10} h={10} borderRadius="2xl" bg="surface.panelMuted" />
        </Stack>

        {[1, 2, 3, 4].map((row) => (
          <Stack
            key={row}
            direction="row"
            gap={4}
            mb={3}
            p={4}
            borderRadius="2xl"
            bg="surface.panelMuted"
            border="1px solid"
            borderColor="surface.border"
            align="center"
            position="relative"
            _after={{
              content: '""',
              position: "absolute",
              left: "18px",
              bottom: "-16px",
              width: "2px",
              height: row === 4 ? "0" : "16px",
              bg: { _light: "blackAlpha.200", _dark: "whiteAlpha.200" },
            }}
          >
            <Box
              w={9}
              h={9}
              borderRadius="lg"
              bg={row % 2 === 0 ? "accent.subtle" : "brand.subtle"}
              border="1px solid"
              borderColor="surface.border"
            />
            <Box w="28%" h={2.5} borderRadius="sm" bg="fg.subtle" />
            <Box
              flex={1}
              h={2.5}
              borderRadius="sm"
              bg="brand.muted"
              opacity={0.72 + row * 0.06}
            />
            <Box w={10} h={2.5} borderRadius="sm" bg="accent.muted" />
          </Stack>
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
      py={{ base: 12, md: 20, lg: 28 }}
      px={{ base: 3, md: 4 }}
    >
      <Box
        position="absolute"
        inset={0}
        bgImage={{
          _light:
            "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.16), transparent 26%), radial-gradient(circle at 80% 10%, rgba(221,107,32,0.14), transparent 22%), repeating-linear-gradient(90deg, rgba(15,23,42,0.05) 0, rgba(15,23,42,0.05) 1px, transparent 1px, transparent 96px)",
          _dark:
            "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.18), transparent 26%), radial-gradient(circle at 80% 10%, rgba(221,107,32,0.16), transparent 22%), repeating-linear-gradient(90deg, rgba(148,163,184,0.08) 0, rgba(148,163,184,0.08) 1px, transparent 1px, transparent 96px)",
        }}
        pointerEvents="none"
      />
      <Container maxW="container.xl">
        <Stack
          position="relative"
          direction={{ base: "column", lg: "row" }}
          gap={{ base: 10, lg: 16 }}
          align="center"
          bg="surface.panel"
          border="1px solid"
          borderColor="surface.border"
          borderRadius={{ base: "3xl", lg: "4xl" }}
          px={{ base: 6, md: 8, lg: 12 }}
          py={{ base: 8, md: 10, lg: 12 }}
          boxShadow={{
            base: "0 30px 60px rgba(15, 23, 42, 0.08)",
            _dark: "0 36px 72px rgba(0, 0, 0, 0.3)",
          }}
        >
          <VStack
            flex={1}
            gap={6}
            align={{ base: "center", lg: "flex-start" }}
            textAlign={{ base: "center", lg: "left" }}
            animationName="fade-in, slide-from-bottom"
            animationDuration="600ms"
            animationTimingFunction="ease-out"
          >
            <Stack
              direction="row"
              align="center"
              gap={3}
              px={3}
              py={2}
              borderRadius="full"
              bg="surface.panelMuted"
              border="1px solid"
              borderColor="surface.border"
            >
              <img
                src={
                  colorMode === "dark"
                    ? "/logo-square-white.svg"
                    : "/logo-square-black.svg"
                }
                alt="Transi-Store"
                width={22}
                height={22}
              />
              <Text
                fontSize="xs"
                fontWeight="semibold"
                letterSpacing="0.24em"
                textTransform="uppercase"
                color="fg.muted"
              >
                Transi-Store
              </Text>
            </Stack>
            <Heading
              as="h1"
              textStyle={{ base: "3xl", md: "4xl", lg: "5xl" }}
              lineHeight="tight"
              letterSpacing="tight"
              maxW="2xl"
            >
              {t("landing.hero.title")}
            </Heading>
            <Text
              textStyle={{ base: "lg", md: "xl" }}
              color="fg.muted"
              maxW="xl"
            >
              {t("landing.hero.subtitle")}
            </Text>

            <Stack
              direction={{ base: "column", sm: "row" }}
              gap={4}
              w={{ base: "full", sm: "auto" }}
            >
              <Button asChild size="lg" colorPalette="brand">
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
            <DecorativeUI />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
