import { Badge, Container, VStack, Box, Stack, Text } from "@chakra-ui/react";
import { Outlet, redirect, useLoaderData } from "react-router";
import { ProjectBreadcrumb } from "~/components/navigation/ProjectBreadcrumb";
import { ProjectNav } from "~/components/navigation/ProjectNav";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug";
import { maybeUserContext } from "~/middleware/auth";
import {
  getOrganizationBySlug,
  isUserMemberOfOrganization,
} from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";
import { ProjectVisibility, ProjectAccessRole } from "~/lib/project-visibility";
import { useTranslation } from "react-i18next";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const maybeUser = context.get(maybeUserContext);

  const organization = await getOrganizationBySlug(params.orgSlug);
  if (!organization) {
    throw new Response("Organization not found", { status: 404 });
  }

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const languages = await getProjectLanguages(project.id);

  let projectAccessRole: ProjectAccessRole;
  if (
    maybeUser !== null &&
    (await isUserMemberOfOrganization(maybeUser.userId, organization.id))
  ) {
    projectAccessRole = ProjectAccessRole.MEMBER;
  } else if (project.visibility === ProjectVisibility.PUBLIC) {
    projectAccessRole = ProjectAccessRole.VIEWER;
  } else {
    const url = new URL(request.url);
    throw redirect(
      `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`,
    );
  }

  return { organization, project, languages, projectAccessRole };
}

export default function ProjectLayout() {
  const { organization, project, languages, projectAccessRole } =
    useLoaderData<typeof loader>();
  const { t } = useTranslation();

  return (
    <Container maxW="container.xl" py={5}>
      <VStack gap={4} align="stretch">
        <Stack
          direction={{ base: "column", md: "row" }}
          gap={2}
          borderBottomWidth={1}
          borderColor="surface.border"
          pb={3}
          align={{ base: "stretch", md: "center" }}
        >
          <Box flex={{ base: "1", md: "auto" }} overflow="hidden">
            <ProjectBreadcrumb
              organizationSlug={organization.slug}
              organizationName={organization.name}
              projectSlug={project.slug}
              projectName={project.name}
            />
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            <Badge
              size="sm"
              colorPalette={
                project.visibility === ProjectVisibility.PUBLIC
                  ? "green"
                  : "gray"
              }
              variant="subtle"
            >
              {project.visibility === ProjectVisibility.PUBLIC
                ? t("projects.visibility.public")
                : t("projects.visibility.private")}
            </Badge>

            <ProjectNav
              organizationSlug={organization.slug}
              projectSlug={project.slug}
              projectAccessRole={projectAccessRole}
            />
          </Box>
        </Stack>

        {project.description && (
          <Box>
            <Text color="fg.muted">{project.description}</Text>
          </Box>
        )}

        <Outlet
          context={{ organization, project, languages, projectAccessRole }}
        />
      </VStack>
    </Container>
  );
}
