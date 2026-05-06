import { Badge, Container, VStack, Box, Stack, Text } from "@chakra-ui/react";
import { Outlet, useLoaderData } from "react-router";
import { ProjectBreadcrumb } from "~/components/navigation/ProjectBreadcrumb";
import { ProjectNav } from "~/components/navigation/ProjectNav";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug";
import { getProjectLanguages } from "~/lib/projects.server";
import { ProjectVisibility } from "~/lib/project-visibility";
import {
  organizationContext,
  projectAccessRoleContext,
  projectContext,
} from "~/middleware/project-access.server";
import { useTranslation } from "react-i18next";

export async function loader({ context }: Route.LoaderArgs) {
  const organization = context.get(organizationContext);
  const project = context.get(projectContext);
  const projectAccessRole = context.get(projectAccessRoleContext);

  const languages = await getProjectLanguages(project.id);

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
