import { Box, Container, HStack, Text, Button } from "@chakra-ui/react";
import { Link, Form } from "react-router";
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
              as={Link}
              to={user ? "/orgs" : "/"}
              fontSize="xl"
              fontWeight="bold"
              color="brand.700"
              _hover={{ color: "brand.600" }}
            >
              transi-store
            </Text>

            {user && (
              <HStack gap={4} fontSize="sm">
                <Text
                  as={Link}
                  to="/orgs"
                  color="brand.600"
                  _hover={{ textDecoration: "underline", color: "brand.700" }}
                >
                  Organisations
                </Text>
                <Text
                  as={Link}
                  to="/search"
                  color="brand.600"
                  _hover={{ textDecoration: "underline", color: "brand.700" }}
                >
                  Recherche
                </Text>
              </HStack>
            )}
          </HStack>

          <HStack gap={2}>
            {user ? (
              <>
                <Text fontSize="sm" color="gray.600">
                  {user.name || user.email}
                </Text>
                <Form action="/auth/logout" method="post">
                  <Button type="submit" size="sm" variant="outline">
                    Deconnexion
                  </Button>
                </Form>
              </>
            ) : (
              <Button as={Link} to="/auth/login" size="sm" colorPalette="brand">
                Connexion
              </Button>
            )}
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
