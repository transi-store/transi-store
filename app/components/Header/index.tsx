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
    <Box as="header" borderBottomWidth={1} borderColor="border" py={4}>
      <Container maxW="container.xl">
        <HStack
          justify="space-between"
          flexWrap="wrap"
          gap={{ base: 2, md: 4 }}
          mdDown={{ flexDirection: "column", alignItems: "stretch" }}
        >
          <HStack
            gap={{ base: 2, md: 6 }}
            mdDown={{ justifyContent: "center" }}
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
            </Link>
            <Text asChild fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">
              <Link to="/">
                <Text as="span" color="header.fg">
                  Transi-
                </Text>
                <Text as="span" color="accent.solid">
                  Store
                </Text>
              </Link>
            </Text>

            {user && (
              <Box hideBelow="md">
                <Navigation lastOrganizationSlug={user.lastOrganizationSlug} />
              </Box>
            )}
          </HStack>

          <HStack gap={2} mdDown={{ justifyContent: "space-between" }}>
            <Box>
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
