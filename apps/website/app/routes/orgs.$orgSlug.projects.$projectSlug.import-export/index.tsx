import { VStack, Container, Stack, Box } from "@chakra-ui/react";
import { useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/index";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { getProjectFiles } from "~/lib/project-files.server";
import type { ImportStats } from "~/lib/import/import-translations.server";
import { processImport } from "~/lib/import/process-import.server";
import { getInstance } from "~/middleware/i18next";
import ImportSection from "./Import";
import ExportSection from "./Export";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";
import { ProjectBreadcrumb } from "~/components/navigation/ProjectBreadcrumb";
import { ProjectNav } from "~/components/navigation/ProjectNav";
import { ProjectAccessRole } from "~/lib/project-visibility";
import { useTranslation } from "react-i18next";

export type ImportActionData =
  | { success: true; importStats: ImportStats; actionTimestamp: number }
  | { success: false; error: string; details?: string };

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

  const [languages, projectFiles] = await Promise.all([
    getProjectLanguages(project.id),
    getProjectFiles(project.id),
  ]);

  return { organization, project, languages, projectFiles };
}

export async function action({
  request,
  params,
  context,
}: Route.ActionArgs): Promise<ImportActionData> {
  const user = context.get(userContext);
  const i18next = getInstance(context);

  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const formData = await request.formData();
  const formAction = formData.get("_action");

  if (formAction !== "import") {
    return { success: false, error: i18next.t("import.errors.unknownAction") };
  }

  const fileIdRaw = formData.get("fileId");
  if (!fileIdRaw || typeof fileIdRaw !== "string") {
    return { success: false, error: i18next.t("files.errors.missingFileId") };
  }
  const fileId = parseInt(fileIdRaw, 10);
  if (isNaN(fileId)) {
    return {
      success: false,
      error: i18next.t("files.errors.invalidFileId", { fileId: fileIdRaw }),
    };
  }

  const result = await processImport({
    organizationId: organization.id,
    projectSlug: params.projectSlug,
    formData,
    fileId,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      details: result.details,
    };
  }

  return {
    success: true,
    importStats: result.importStats,
    actionTimestamp: Date.now(),
  };
}

export default function ProjectImportExport({
  loaderData,
}: Route.ComponentProps) {
  const { organization, project, languages, projectFiles } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
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
              items={[
                {
                  label: t("import.title"),
                  to: `/orgs/${organization.slug}/projects/${project.slug}/import-export`,
                },
              ]}
            />
          </Box>
          <ProjectNav
            organizationSlug={organization.slug}
            projectSlug={project.slug}
            projectAccessRole={ProjectAccessRole.MEMBER}
          />
        </Stack>

        <VStack gap={6} align="stretch">
          <ImportSection
            languages={languages}
            projectFiles={projectFiles}
            isSubmitting={isSubmitting}
            actionData={actionData}
          />

          <ExportSection
            languages={languages}
            projectFiles={projectFiles}
            organizationSlug={organization.slug}
            projectSlug={project.slug}
          />
        </VStack>
      </VStack>
    </Container>
  );
}
