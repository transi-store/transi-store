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
import { Link, NavLink, Outlet, useLoaderData, data } from "react-router";
import { LuFolderOpen, LuUsers, LuSettings } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug";
import {
  requireUser,
  updateSessionLastOrganization,
} from "~/lib/session.server";
import {
  requireOrganizationMembership,
  updateUserLastOrganization,
} from "~/lib/organizations.server";
import { db, schema } from "~/lib/db.server";
import { eq } from "drizzle-orm";
import { getOrganizationApiKeys } from "~/lib/api-keys.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  // Mettre à jour la dernière organisation visitée (en DB et en session)
  const headers: HeadersInit = {};
  if (user.lastOrganizationId !== organization.id) {
    await updateUserLastOrganization(user.userId, organization.id);
    const setCookie = await updateSessionLastOrganization(
      request,
      organization.id,
      organization.slug,
    );
    headers["Set-Cookie"] = setCookie;
  }

  // Récupérer les statistiques pour l'en-tête
  const projects = await db.query.projects.findMany({
    where: eq(schema.projects.organizationId, organization.id),
  });

  const memberships = await db.query.organizationMembers.findMany({
    where: eq(schema.organizationMembers.organizationId, organization.id),
  });

  const apiKeys = await getOrganizationApiKeys(organization.id);

  return data(
    {
      organization,
      stats: {
        projectsCount: projects.length,
        membersCount: memberships.length,
        apiKeysCount: apiKeys.length,
      },
    },
    { headers },
  );
}

export default function OrganizationLayout() {
  const { organization, stats } = useLoaderData<typeof loader>();

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
                {stats.projectsCount}
              </Heading>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Membres
              </Text>
              <Heading as="h3" size="xl">
                {stats.membersCount}
              </Heading>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Clés d'API
              </Text>
              <Heading as="h3" size="xl">
                {stats.apiKeysCount}
              </Heading>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>

        {/* Navigation par tabs */}
        <Box borderBottomWidth={1} borderColor="gray.200">
          <HStack gap={0} pb={0}>
            <NavLink
              to={`/orgs/${organization.slug}`}
              end
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderBottom: isActive ? "2px solid" : "2px solid transparent",
                borderColor: isActive
                  ? "var(--chakra-colors-brand-500)"
                  : "transparent",
                color: isActive
                  ? "var(--chakra-colors-brand-600)"
                  : "var(--chakra-colors-gray-600)",
                fontWeight: isActive ? "600" : "400",
                textDecoration: "none",
                transition: "all 0.2s",
              })}
            >
              <LuFolderOpen /> Projets
            </NavLink>
            <NavLink
              to={`/orgs/${organization.slug}/members`}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderBottom: isActive ? "2px solid" : "2px solid transparent",
                borderColor: isActive
                  ? "var(--chakra-colors-brand-500)"
                  : "transparent",
                color: isActive
                  ? "var(--chakra-colors-brand-600)"
                  : "var(--chakra-colors-gray-600)",
                fontWeight: isActive ? "600" : "400",
                textDecoration: "none",
                transition: "all 0.2s",
              })}
            >
              <LuUsers /> Membres
            </NavLink>
            <NavLink
              to={`/orgs/${organization.slug}/settings`}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderBottom: isActive ? "2px solid" : "2px solid transparent",
                borderColor: isActive
                  ? "var(--chakra-colors-brand-500)"
                  : "transparent",
                color: isActive
                  ? "var(--chakra-colors-brand-600)"
                  : "var(--chakra-colors-gray-600)",
                fontWeight: isActive ? "600" : "400",
                textDecoration: "none",
                transition: "all 0.2s",
              })}
            >
              <LuSettings /> Paramètres
            </NavLink>
          </HStack>
        </Box>

        {/* Contenu des pages enfants */}
        <Outlet />
      </VStack>
    </Container>
  );
}
