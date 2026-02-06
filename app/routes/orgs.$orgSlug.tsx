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
import { useTranslation } from "react-i18next";
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
import { db } from "~/lib/db.server";
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
    where: { organizationId: organization.id },
  });

  const memberships = await db.query.organizationMembers.findMany({
    where: { organizationId: organization.id },
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
  const { t } = useTranslation();
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
            <Button asChild variant="outline" size="sm">
              <Link to="/orgs">{t("orgs.return")}</Link>
            </Button>
          </HStack>
        </Box>

        {/* Statistiques */}
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="fg.muted" mb={1}>
                {t("orgs.projects")}
              </Text>
              <Heading as="h3" size="xl">
                {stats.projectsCount}
              </Heading>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="fg.muted" mb={1}>
                {t("orgs.members")}
              </Text>
              <Heading as="h3" size="xl">
                {stats.membersCount}
              </Heading>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <Text fontSize="sm" color="fg.muted" mb={1}>
                {t("orgs.apiKeys")}
              </Text>
              <Heading as="h3" size="xl">
                {stats.apiKeysCount}
              </Heading>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>

        {/* Navigation par tabs */}
        <Box borderBottomWidth={1} borderColor="border">
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
                  ? "var(--chakra-colors-brand-solid)"
                  : "transparent",
                color: isActive
                  ? "var(--chakra-colors-brand-fg)"
                  : "var(--chakra-colors-fg-muted)",
                fontWeight: isActive ? "600" : "400",
                textDecoration: "none",
                transition: "all 0.2s",
              })}
            >
              <LuFolderOpen /> {t("orgs.tab.projects")}
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
                  ? "var(--chakra-colors-brand-solid)"
                  : "transparent",
                color: isActive
                  ? "var(--chakra-colors-brand-fg)"
                  : "var(--chakra-colors-fg-muted)",
                fontWeight: isActive ? "600" : "400",
                textDecoration: "none",
                transition: "all 0.2s",
              })}
            >
              <LuUsers /> {t("orgs.tab.members")}
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
                  ? "var(--chakra-colors-brand-solid)"
                  : "transparent",
                color: isActive
                  ? "var(--chakra-colors-brand-fg)"
                  : "var(--chakra-colors-fg-muted)",
                fontWeight: isActive ? "600" : "400",
                textDecoration: "none",
                transition: "all 0.2s",
              })}
            >
              <LuSettings /> {t("orgs.tab.settings")}
            </NavLink>
          </HStack>
        </Box>

        {/* Contenu des pages enfants */}
        <Outlet />
      </VStack>
    </Container>
  );
}
