import { Box, Container, HStack, Text, Button } from "@chakra-ui/react";
import { Menu, Portal } from "@chakra-ui/react";
import { Link, Form, useLocation } from "react-router";
import {
  LuChevronDown,
  LuBuilding2,
  LuLanguages,
  LuLogOut,
  LuCheck,
} from "react-icons/lu";
import type { SessionData } from "~/lib/session.server";
import { useTranslation } from "react-i18next";
import { DEFAULT_LANGUAGE_CODE, AVAILABLE_LANGUAGES } from "~/lib/i18n";

interface HeaderProps {
  user: SessionData | null;
}

export function Header({ user }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const currentLang = i18n.language || DEFAULT_LANGUAGE_CODE;
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
              <Link to={user ? "/orgs" : "/"}>{t("header.siteName")}</Link>
            </Text>

            {user && (
              <HStack gap={4} fontSize="sm">
                {user.lastOrganizationSlug && (
                  <Text
                    asChild
                    color="brand.600"
                    _hover={{ textDecoration: "underline", color: "brand.700" }}
                  >
                    <Link to={`/orgs/${user.lastOrganizationSlug}`}>
                      {t("header.projects")}
                    </Link>
                  </Text>
                )}
                <Text
                  asChild
                  color="brand.600"
                  _hover={{ textDecoration: "underline", color: "brand.700" }}
                >
                  <Link to="/search">{t("header.search")}</Link>
                </Text>
              </HStack>
            )}
          </HStack>

          <HStack gap={2}>
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button variant="ghost" size="sm" aria-label="Change language">
                  <LuLanguages />{" "}
                  {
                    AVAILABLE_LANGUAGES.find((l) => l.code === currentLang)
                      ?.flag
                  }
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    {AVAILABLE_LANGUAGES.map((lang) => {
                      const params = new URLSearchParams(location.search);
                      params.set("lng", lang.code);
                      const search = params.toString();
                      const to = `${location.pathname}${search ? `?${search}` : ""}${location.hash}`;

                      return (
                        <Menu.Item key={lang.code} value={lang.code} asChild>
                          <Link
                            to={to}
                            aria-current={
                              lang.code === currentLang ? "true" : undefined
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ marginRight: 8 }}>
                                {lang.flag}
                              </span>
                              {lang.name}
                            </span>
                            {lang.code === currentLang && <LuCheck />}
                          </Link>
                        </Menu.Item>
                      );
                    })}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>

            {user ? (
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button variant="ghost" size="sm">
                    {user.name || user.email}
                    <LuChevronDown />
                  </Button>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content>
                      <Menu.Item value="organizations" asChild>
                        <Link to="/orgs">
                          <LuBuilding2 />
                          {t("header.myOrganizations")}
                        </Link>
                      </Menu.Item>
                      <Menu.Separator />
                      <Form action="/auth/logout" method="post">
                        <Menu.Item value="logout" asChild>
                          <button type="submit" style={{ width: "100%" }}>
                            <LuLogOut />
                            {t("header.logout")}
                          </button>
                        </Menu.Item>
                      </Form>
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>
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
