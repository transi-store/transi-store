import { Box, Container, HStack, Text, Button } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { SessionData } from "~/lib/session.server";
import { Navigation } from "./Navigation";
import { LanguageSelector } from "./LanguageSelector";
import { UserMenu } from "./UserMenu";
import { ColorModeButton, useColorMode } from "../ui/color-mode";

type HeaderProps = {
  user: SessionData | null;
};

export function Header({ user }: HeaderProps) {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={20}
      py={4}
      px={{ base: 3, md: 4 }}
    >
      <Container maxW="container.xl">
        <HStack
          justify="space-between"
          flexWrap="wrap"
          gap={{ base: 2, md: 4 }}
          mdDown={{ flexDirection: "column", alignItems: "stretch" }}
          bg="header.bg"
          border="1px solid"
          borderColor="header.border"
          borderRadius="3xl"
          backdropFilter="blur(18px)"
          boxShadow={{
            base: "0 20px 40px rgba(15, 23, 42, 0.08)",
            _dark: "0 20px 40px rgba(0, 0, 0, 0.28)",
          }}
          px={{ base: 4, md: 5 }}
          py={{ base: 3, md: 3.5 }}
        >
          <HStack
            gap={{ base: 2, md: 6 }}
            mdDown={{ justifyContent: "center" }}
          >
            <HStack
              asChild
              gap={3}
              px={2}
              py={1.5}
              borderRadius="full"
              bg="surface.panelMuted"
              border="1px solid"
              borderColor="surface.border"
            >
              <Link to="/">
                <img
                  src={
                    colorMode === "dark"
                      ? "/logo-square-white.svg"
                      : "/logo-square-black.svg"
                  }
                  alt={t("header.logoAlt")}
                  width={32}
                  height={32}
                />
                <Text
                  as="span"
                  fontSize={{ base: "lg", md: "xl" }}
                  fontWeight="bold"
                  letterSpacing="tight"
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

          <HStack gap={2} mdDown={{ justifyContent: "space-between" }}>
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
                  <Button asChild size="sm">
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
