import {
  Container,
  Heading,
  VStack,
  Button,
  Box,
  HStack,
  Text,
} from "@chakra-ui/react";
import { Link, Outlet, useLoaderData, useLocation } from "react-router";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, params.orgSlug);

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const languages = await getProjectLanguages(project.id);

  return { organization, project, languages };
}

export default function ProjectLayout() {
  const { organization, project, languages } = useLoaderData<typeof loader>();
  const location = useLocation();

  const navItems = [
    { path: "translations", label: "Traductions" },
    { path: "settings", label: "Paramètres" },
    { path: "import-export", label: "Import/Export" },
  ];

  return (
    <Container maxW="container.xl" py={10}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Heading as="h1" size="2xl">
              {project.name}
            </Heading>
            <Button
              as={Link}
              to={`/orgs/${organization.slug}`}
              variant="outline"
              size="sm"
            >
              Retour
            </Button>
          </HStack>
          {project.description && (
            <Text color="gray.600" mb={4}>
              {project.description}
            </Text>
          )}
          <Text fontSize="sm" color="gray.600">
            /{organization.slug}/{project.slug}
          </Text>
        </Box>

        {/* Navigation */}
        <HStack gap={2} borderBottomWidth={1} pb={2}>
          {navItems.map((item) => {
            const fullPath = `/orgs/${organization.slug}/projects/${project.slug}/${item.path}`;
            const isActive = location.pathname === fullPath;

            return (
              <Button
                key={item.path}
                as={Link}
                to={fullPath}
                variant={isActive ? "solid" : "ghost"}
                colorPalette={isActive ? "brand" : "gray"}
                size="sm"
              >
                {item.label}
              </Button>
            );
          })}
        </HStack>

        {/* Child route content */}
        <Outlet context={{ organization, project, languages }} />
      </VStack>
    </Container>
  );
}
