import {
  Container,
  Heading,
  VStack,
  Button,
  Box,
  Text,
  SimpleGrid,
  Card,
} from "@chakra-ui/react";
import { Link, useLoaderData, redirect } from "react-router";
import { LuPlus } from "react-icons/lu";
import type { Route } from "./+types/orgs._index";
import { requireUser } from "~/lib/session.server";
import { getUserOrganizations } from "~/lib/organizations.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organizations = await getUserOrganizations(user.userId);

  return { organizations };
}

export default function OrganizationsIndex() {
  const { organizations } = useLoaderData<typeof loader>();

  return (
    <Container maxW="container.xl" py={10}>
      <VStack gap={6} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading as="h1" size="2xl">
            Mes organisations
          </Heading>
          <Button asChild colorPalette="brand">
            <Link to="/orgs/new">
              <LuPlus /> Nouvelle organisation
            </Link>
          </Button>
        </Box>

        {organizations.length === 0 ? (
          <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
            <Text fontSize="lg" color="gray.600" mb={4}>
              Vous n'etes membre d'aucune organisation
            </Text>
            <Button asChild colorPalette="brand">
              <Link to="/orgs/new">
                <LuPlus /> Creer ma premiere organisation
              </Link>
            </Button>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {organizations.map((org) => (
              <Card.Root key={org.id} asChild>
                <Link to={`/orgs/${org.slug}`}>
                  <Card.Body>
                    <Heading as="h3" size="md" mb={2}>
                      {org.name}
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      /{org.slug}
                    </Text>
                  </Card.Body>
                </Link>
              </Card.Root>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
}
