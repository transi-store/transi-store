import {
  Heading,
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
import { db } from "~/lib/db.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  // Récupérer les projets de l'organisation
  const projects = await db.query.projects.findMany({
    where: { organizationId: organization.id },
  });

  return { organization, projects };
}

export default function OrganizationProjects() {
  const { organization, projects } = useLoaderData<typeof loader>();

  return (
    <Box pt={6}>
      <HStack justify="space-between" mb={4}>
        <Heading as="h2" size="lg">
          Projets
        </Heading>
        <Button asChild colorPalette="brand" size="sm">
          <Link to={`/orgs/${organization.slug}/projects/new`}>
            <LuPlus /> Nouveau projet
          </Link>
        </Button>
      </HStack>

      {projects.length === 0 ? (
        <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="gray.600" mb={4}>
            Aucun projet dans cette organisation
          </Text>
          <Button asChild colorPalette="brand">
            <Link to={`/orgs/${organization.slug}/projects/new`}>
              <LuPlus /> Créer le premier projet
            </Link>
          </Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          {projects.map((project) => (
            <Card.Root key={project.id} asChild>
              <Link to={`/orgs/${organization.slug}/projects/${project.slug}`}>
                <Card.Body>
                  <Heading as="h3" size="md" mb={2}>
                    {project.name}
                  </Heading>
                  {project.description && (
                    <Text fontSize="sm" color="gray.600">
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
  );
}
