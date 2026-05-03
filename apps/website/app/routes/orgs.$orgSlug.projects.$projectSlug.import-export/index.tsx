import { VStack } from "@chakra-ui/react";
import { useActionData, useNavigation, useOutletContext } from "react-router";
import type { Route } from "./+types/index";
import { maybeUserContext, requireUserFromContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import { getProjectFiles } from "~/lib/project-files.server";
import type { ImportStats } from "~/lib/import/import-translations.server";
import { processImport } from "~/lib/import/process-import.server";
import { getInstance } from "~/middleware/i18next";
import ImportSection from "./Import";
import ExportSection from "./Export";
import type {
  Organization,
  Project,
  ProjectLanguage,
} from "../../../drizzle/schema";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";

type ContextType = {
  organization: Organization;
  project: Project;
  languages: Array<ProjectLanguage>;
};

export type ImportActionData =
  | { success: true; importStats: ImportStats; actionTimestamp: number }
  | { success: false; error: string; details?: string };

export async function loader({ params, context }: Route.LoaderArgs) {
  const maybeUser = context.get(maybeUserContext);
  const user = requireUserFromContext(maybeUser);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const projectFiles = await getProjectFiles(project.id);

  return { projectFiles };
}

export async function action({
  request,
  params,
  context,
}: Route.ActionArgs): Promise<ImportActionData> {
  const maybeUser = context.get(maybeUserContext);
  const user = requireUserFromContext(maybeUser);
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
  const { projectFiles } = loaderData;
  const { organization, project, languages } = useOutletContext<ContextType>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
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
  );
}
