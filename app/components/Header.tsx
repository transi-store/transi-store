import { Box, Container, HStack, Text, Button } from "@chakra-ui/react";
import { Menu, Portal } from "@chakra-ui/react";
import { Link, Form } from "react-router";
import { LuChevronDown, LuBuilding2, LuLogOut } from "react-icons/lu";
import type { SessionData } from "~/lib/session.server";

interface HeaderProps {
  user: SessionData | null;
}

export function Header({ user }: HeaderProps) {
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
              <Link to={user ? "/orgs" : "/"}>transi-store</Link>
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
                      Projets
                    </Link>
                  </Text>
                )}
                <Text
                  asChild
                  color="brand.600"
                  _hover={{ textDecoration: "underline", color: "brand.700" }}
                >
                  <Link to="/search">Recherche</Link>
                </Text>
              </HStack>
            )}
          </HStack>

          <HStack gap={2}>
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
                          Mes organisations
                        </Link>
                      </Menu.Item>
                      <Menu.Separator />
                      <Form action="/auth/logout" method="post">
                        <Menu.Item value="logout" asChild>
                          <button type="submit" style={{ width: "100%" }}>
                            <LuLogOut />
                            Déconnexion
                          </button>
                        </Menu.Item>
                      </Form>
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>
            ) : (
              <Button asChild size="sm" colorPalette="brand">
                <Link to="/auth/login">Connexion</Link>
              </Button>
            )}
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
