import { Container, VStack, Box, Stack, Text } from "@chakra-ui/react";
import { Outlet, useLoaderData } from "react-router";
import { ProjectBreadcrumb } from "~/components/navigation/ProjectBreadcrumb";
import { ProjectNav } from "~/components/navigation/ProjectNav";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";

export async function loader({ params, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const languages = await getProjectLanguages(project.id);

  return { organization, project, languages };
}

export default function ProjectLayout() {
  const { organization, project, languages } = useLoaderData<typeof loader>();

  return (
    <Container maxW="container.xl" py={5} px={{ base: 3, md: 4 }}>
      <VStack gap={4} align="stretch">
        <Stack
          direction={{ base: "column", md: "row" }}
          gap={2}
          bg="surface.panel"
          border="1px solid"
          borderColor="surface.border"
          borderRadius="3xl"
          px={{ base: 4, md: 5 }}
          py={4}
          align={{ base: "stretch", md: "center" }}
          boxShadow={{
            base: "0 18px 36px rgba(15, 23, 42, 0.06)",
            _dark: "0 18px 36px rgba(0, 0, 0, 0.24)",
          }}
        >
          <Box flex={{ base: "1", md: "auto" }} overflow="hidden">
            <ProjectBreadcrumb
              organizationSlug={organization.slug}
              organizationName={organization.name}
              projectSlug={project.slug}
              projectName={project.name}
            />
          </Box>

          <ProjectNav
            organizationSlug={organization.slug}
            projectSlug={project.slug}
          />
        </Stack>

        {project.description && (
          <Box
            bg="surface.panelMuted"
            border="1px solid"
            borderColor="surface.border"
            borderRadius="2xl"
            px={5}
            py={4}
          >
            <Text color="fg.muted">{project.description}</Text>
          </Box>
        )}

        <Outlet context={{ organization, project, languages }} />
      </VStack>
    </Container>
  );
}
