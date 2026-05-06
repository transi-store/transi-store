import {
  Container,
  Heading,
  VStack,
  Box,
  Text,
  SimpleGrid,
  Card,
  HStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import {
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
  data,
} from "react-router";
import { LuFolderOpen, LuUsers, LuSettings } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug";
import { userContext } from "~/middleware/auth.server";
import { updateSessionLastOrganization } from "~/lib/session.server";
import {
  requireOrganizationMembership,
  updateUserLastOrganization,
} from "~/lib/organizations.server";
import { countOrganizationApiKeys } from "~/lib/api-keys.server";
import { OrgBreadcrumb } from "~/components/navigation/OrgBreadcrumb";
import {
  countMembersForOrganization,
  countProjectsForOrganization,
} from "~/lib/projects.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
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

  // get projects for the organization
  const projectsCount = await countProjectsForOrganization(organization.id);

  const membersCount = await countMembersForOrganization(organization.id);

  const apiKeysCount = await countOrganizationApiKeys(organization.id);

  return data(
    {
      organization,
      stats: {
        projectsCount,
        membersCount,
        apiKeysCount,
      },
    },
    { headers },
  );
}

export default function OrganizationLayout() {
  const { t } = useTranslation();
  const { organization, stats } = useLoaderData<typeof loader>();
  const location = useLocation();

  const breadcrumbCurrent = (() => {
    if (location.pathname.endsWith("/members")) return t("orgs.tab.members");
    if (location.pathname.endsWith("/settings")) return t("orgs.tab.settings");
    return undefined;
  })();

  return (
    <Container maxW="container.xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <OrgBreadcrumb
            organizationSlug={organization.slug}
            organizationName={organization.name}
            current={breadcrumbCurrent}
          />
          <Heading as="h1" size="2xl" mt={2}>
            {organization.name}
          </Heading>
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
