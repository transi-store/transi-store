import {
  Box,
  Heading,
  Text,
  Container,
  VStack,
  Button,
  HStack,
} from "@chakra-ui/react";
import { Form, useLoaderData, Link, redirect } from "react-router";
import type { Route } from "./+types/_index";
import { getUserFromSession } from "~/lib/session.server";

export function meta() {
  return [
    { title: "transi-store - Gestion des traductions" },
    {
      name: "description",
      content: "Outil de gestion de traductions multi-projets",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUserFromSession(request);

  // Si l'utilisateur est connecté, rediriger vers les organisations
  if (user) {
    throw redirect("/orgs");
  }

  return { user };
}

export default function Index() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <Container maxW="container.lg" py={10}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="start">
          <Box>
            <Heading as="h1" size="2xl">
              transi-store
            </Heading>
            <Text fontSize="xl" color="gray.600">
              Outil de gestion de traductions multi-projets
            </Text>
          </Box>
          <Box>
            {user ? (
              <VStack align="end" gap={2}>
                <Text fontSize="sm" color="gray.600">
                  Connecte en tant que {user.name || user.email}
                </Text>
                <Form action="/auth/logout" method="post">
                  <Button type="submit" size="sm" variant="outline">
                    Deconnexion
                  </Button>
                </Form>
              </VStack>
            ) : (
              <Button as={Link} to="/auth/login" size="sm" colorPalette="brand">
                Connexion
              </Button>
            )}
          </Box>
        </HStack>
        <Box p={6} borderWidth={1} borderRadius="lg">
          <Text>
            Bienvenue ! Ce projet permet de gerer les traductions de vos
            applications.
          </Text>
          {user && (
            <Text mt={4}>
              Vous etes maintenant connecte et pouvez commencer a gerer vos
              traductions.
            </Text>
          )}
        </Box>
      </VStack>
    </Container>
  );
}
