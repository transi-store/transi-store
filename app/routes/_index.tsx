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
import { getUserOrganizations } from "~/lib/organizations.server";

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

  // Si l'utilisateur est connecté, vérifier le nombre d'organisations
  if (user) {
    const organizations = await getUserOrganizations(user.userId);

    // Si une seule organisation, rediriger directement vers celle-ci
    if (organizations.length === 1) {
      throw redirect(`/orgs/${organizations[0].slug}`);
    }

    // Sinon, rediriger vers la liste des organisations
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
            {user && (
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
