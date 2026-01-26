import {
  Box,
  Heading,
  Text,
  Container,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { redirect } from "react-router";
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

  return null;
}

export default function Index() {
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
        </HStack>
        <Box p={6} borderWidth={1} borderRadius="lg">
          <Text>
            Bienvenue ! Ce projet permet de gerer les traductions de vos
            applications.
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
