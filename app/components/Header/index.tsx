import { Box, Container, HStack, Text, Button } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { SessionData } from "~/lib/session.server";
import { Navigation } from "./Navigation";
import { LanguageSelector } from "./LanguageSelector";
import { UserMenu } from "./UserMenu";
import { ColorModeButton } from "../ui/color-mode";

type HeaderProps = {
  user: SessionData | null;
};

export function Header({ user }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <Box
      as="header"
      borderBottomWidth={1}
      borderColor="brand.200"
      py={4}
      bg="brand.50"
    >
      <Container maxW="container.xl">
        <HStack justify="space-between">
          <HStack gap={6}>
            <Text
              asChild
              fontSize="xl"
              fontWeight="bold"
              color="brand.700"
              _hover={{ color: "brand.600" }}
            >
              <Link to="/">{t("header.siteName")}</Link>
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
              <Button asChild size="sm" colorPalette="brand">
                <Link to="/auth/login">{t("header.login")}</Link>
              </Button>
            )}
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
