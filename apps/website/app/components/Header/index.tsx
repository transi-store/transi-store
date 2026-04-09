import { Box, Container, HStack, Text, Button } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { SessionData } from "~/lib/session.server";
import { Navigation } from "./Navigation";
import { LanguageSelector } from "./LanguageSelector";
import { UserMenu } from "./UserMenu";
import { ColorModeButton, useColorMode } from "../ui/color-mode";
import { TransistorLegs } from "../TransistorLegs";

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
        >
          <HStack
            gap={{ base: 2, md: 6 }}
            mdDown={{ justifyContent: "center" }}
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

            <TransistorLegs height={18} opacity={0.4} />

            {user && (
              <Box hideBelow="md">
                <Navigation lastOrganizationSlug={user.lastOrganizationSlug} />
              </Box>
            )}
          </HStack>

          <HStack gap={1} mdDown={{ justifyContent: "space-between" }}>
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
