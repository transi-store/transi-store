import { Box, Container, HStack, Text, Button } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { SessionData } from "~/lib/session.server";
import { Navigation } from "./Navigation";
import { LanguageSelector } from "./LanguageSelector";
import { UserMenu } from "./UserMenu";
import { ColorModeButton, useColorMode } from "../ui/color-mode";

/** Subtle circuit-board traces as a background for the header bar. */
function HeaderCircuitBg() {
  return (
    <Box
      position="absolute"
      inset={0}
      pointerEvents="none"
      overflow="hidden"
      opacity={0.12}
      borderRadius="lg"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Horizontal traces */}
        <line
          x1="0"
          y1="12"
          x2="250"
          y2="12"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="300"
          y1="12"
          x2="800"
          y2="12"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="38"
          x2="400"
          y2="38"
          stroke="#1569D4"
          strokeWidth="1"
        />
        <line
          x1="440"
          y1="38"
          x2="800"
          y2="38"
          stroke="#87C241"
          strokeWidth="1"
        />
        {/* Vertical connectors */}
        <line
          x1="250"
          y1="0"
          x2="250"
          y2="25"
          stroke="#43AECE"
          strokeWidth="1"
        />
        <line
          x1="440"
          y1="25"
          x2="440"
          y2="50"
          stroke="#87C241"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        <line
          x1="600"
          y1="0"
          x2="600"
          y2="50"
          stroke="#1569D4"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        {/* Pin nodes */}
        <circle cx="250" cy="12" r="3" fill="#43AECE" />
        <circle cx="440" cy="38" r="3" fill="#87C241" />
        <circle cx="600" cy="25" r="2.5" fill="#1569D4" />
        {/* Connector pad */}
        <rect
          x="290"
          y="6"
          width="12"
          height="12"
          rx="2"
          fill="none"
          stroke="#43AECE"
          strokeWidth="1"
        />
      </svg>
    </Box>
  );
}

type HeaderProps = {
  user: SessionData | null;
};

export function Header({ user }: HeaderProps) {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();

  return (
    <Box as="header" position="sticky" top={0} zIndex={20} py={3} px={4}>
      <Container maxW="container.xl">
        <HStack
          justify="space-between"
          flexWrap="wrap"
          gap={{ base: 2, md: 4 }}
          mdDown={{ flexDirection: "column", alignItems: "stretch" }}
          bg="header.bg"
          border="1px solid"
          borderColor="header.border"
          borderRadius="lg"
          backdropFilter="blur(20px)"
          boxShadow="0 0 12px rgba(67,174,206,0.1)"
          px={{ base: 4, md: 5 }}
          py={2.5}
          position="relative"
          overflow="hidden"
        >
          <HeaderCircuitBg />

          <HStack
            gap={{ base: 2, md: 6 }}
            mdDown={{ justifyContent: "center" }}
            position="relative"
          >
            <HStack asChild gap={2.5} px={1} py={1}>
              <Link to="/">
                <img
                  src={
                    colorMode === "dark"
                      ? "/logo-square-white.svg"
                      : "/logo-square-black.svg"
                  }
                  alt={t("header.logoAlt")}
                  width={28}
                  height={28}
                />
                <Text
                  as="span"
                  fontSize="md"
                  fontWeight="bold"
                  letterSpacing="tight"
                  fontFamily="heading"
                >
                  <Text as="span" color="header.fg">
                    Transi-
                  </Text>
                  <Text as="span" color="accent.solid">
                    Store
                  </Text>
                </Text>
              </Link>
            </HStack>

            {user && (
              <Box hideBelow="md">
                <Navigation lastOrganizationSlug={user.lastOrganizationSlug} />
              </Box>
            )}
          </HStack>

          <HStack
            gap={1}
            mdDown={{ justifyContent: "space-between" }}
            position="relative"
          >
            <Box>
              <Button asChild variant="ghost" size="sm">
                <Link to="/docs">{t("header.docs")}</Link>
              </Button>

              <Button asChild variant="ghost" size="sm">
                <Link to="/api/doc">{t("header.api-doc")}</Link>
              </Button>

              <LanguageSelector />

              <ColorModeButton />
            </Box>

            <Box>
              {user ? (
                <UserMenu user={user} />
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" hideBelow="sm">
                    <Link to="/pricing">{t("header.pricing")}</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    colorPalette="accent"
                    fontWeight="bold"
                  >
                    <Link to="/auth/login">{t("header.login")}</Link>
                  </Button>
                </>
              )}
            </Box>
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
