import {
  Container,
  Heading,
  VStack,
  Button,
  Box,
  Text,
  SimpleGrid,
  Card,
  HStack,
} from "@chakra-ui/react";
import { Link, useLoaderData } from "react-router";
import { LuPlus } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug._index";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { db, schema } from "~/lib/db.server";
import { eq, inArray } from "drizzle-orm";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug
  );

  // Récupérer les projets de l'organisation
  const projects = await db.query.projects.findMany({
    where: eq(schema.projects.organizationId, organization.id),
  });

  // Récupérer les membres
  const memberships = await db.query.organizationMembers.findMany({
    where: eq(schema.organizationMembers.organizationId, organization.id),
  });

  // Récupérer les utilisateurs correspondants
  const userIds = memberships.map((m) => m.userId);
  const users = userIds.length > 0
    ? await db.query.users.findMany({
        where: inArray(schema.users.id, userIds),
      })
    : [];

  // Combiner les données
  const members = memberships.map((m) => ({
    ...m,
    user: users.find((u) => u.id === m.userId)!,
  }));

  return { organization, projects, members };
}

export default function OrganizationDashboard() {
  const { organization, projects, members } = useLoaderData<typeof loader>();

  return (
    <Container maxW="container.xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Heading as="h1" size="2xl">
              {organization.name}
            </Heading>
            <Button as={Link} to="/orgs" variant="outline" size="sm">
              Retour aux organisations
            </Button>
          </HStack>
          <Text color="gray.600">/{organization.slug}</Text>
        </Box>

        {/* Statistiques */}
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Projets
              </Text>
              <Heading as="h3" size="xl">
                {projects.length}
              </Heading>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Membres
              </Text>
              <Heading as="h3" size="xl">
                {members.length}
              </Heading>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Traductions
              </Text>
              <Heading as="h3" size="xl">
                -
              </Heading>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>

        {/* Projets */}
        <Box>
          <HStack justify="space-between" mb={4}>
            <Heading as="h2" size="lg">
              Projets
            </Heading>
            <Button
              as={Link}
              to={`/orgs/${organization.slug}/projects/new`}
              colorPalette="brand"
              size="sm"
            >
              <LuPlus /> Nouveau projet
            </Button>
          </HStack>

          {projects.length === 0 ? (
            <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
              <Text color="gray.600" mb={4}>
                Aucun projet dans cette organisation
              </Text>
              <Button
                as={Link}
                to={`/orgs/${organization.slug}/projects/new`}
                colorPalette="brand"
              >
                <LuPlus /> Creer le premier projet
              </Button>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
              {projects.map((project) => (
                <Card.Root key={project.id} asChild>
                  <Link
                    to={`/orgs/${organization.slug}/projects/${project.slug}`}
                  >
                    <Card.Body>
                      <Heading as="h3" size="md" mb={2}>
                        {project.name}
                      </Heading>
                      {project.description && (
                        <Text fontSize="sm" color="gray.600" noOfLines={2}>
                          {project.description}
                        </Text>
                      )}
                    </Card.Body>
                  </Link>
                </Card.Root>
              ))}
            </SimpleGrid>
          )}
        </Box>

        {/* Membres */}
        <Box>
          <Heading as="h2" size="lg" mb={4}>
            Membres ({members.length})
          </Heading>

          <VStack align="stretch" gap={2}>
            {members.map((member) => (
              <Box key={member.id} p={4} borderWidth={1} borderRadius="md">
                <Text fontWeight="medium">
                  {member.user.name || member.user.email}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {member.user.email}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
