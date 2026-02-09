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
        <HStack justify="space-between">
          <HStack gap={6}>
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
            <Text asChild fontSize="xl" fontWeight="bold">
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
              <Navigation lastOrganizationSlug={user.lastOrganizationSlug} />
            )}
          </HStack>

          <HStack gap={2}>
            <LanguageSelector />

            <ColorModeButton />

            {user ? (
              <UserMenu user={user} />
            ) : (
              <Button asChild size="sm">
                <Link to="/auth/login">{t("header.login")}</Link>
              </Button>
            )}
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
