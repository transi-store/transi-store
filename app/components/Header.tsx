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
      borderColor="gray.200"
      py={4}
      bg="white"
    >
      <Container maxW="container.xl">
        <HStack justify="space-between">
          <HStack gap={6}>
            <Text
              as={Link}
              to={user ? "/orgs" : "/"}
              fontSize="xl"
              fontWeight="bold"
            >
              mapadinternational
            </Text>

            {user && (
              <HStack gap={4} fontSize="sm">
                <Text as={Link} to="/orgs" _hover={{ textDecoration: "underline" }}>
                  Organisations
                </Text>
                <Text as={Link} to="/search" _hover={{ textDecoration: "underline" }}>
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
              <Button as={Link} to="/auth/login" size="sm" colorScheme="blue">
                Connexion
              </Button>
            )}
          </HStack>
        </HStack>
      </Container>
    </Box>
  );
}
