import { VStack } from "@chakra-ui/react";
import { useActionData, useNavigation, useOutletContext } from "react-router";
import type { Route } from "./+types/index";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import type { ImportStats } from "~/lib/import/import-translations.server";
import { processImport } from "~/lib/import/process-import.server";
import { getInstance } from "~/middleware/i18next";
import ImportSection from "./Import";
import ExportSection from "./Export";
import type {
  Organization,
  Project,
  ProjectFile,
  ProjectLanguage,
} from "../../../drizzle/schema";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";

type ContextType = {
  organization: Organization;
  project: Project;
  languages: Array<ProjectLanguage>;
  projectFiles: Array<ProjectFile>;
};

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

  return {};
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

  // TODO create a method that handle all "formData.get and validation" in one place to avoid repeating
  const fileIdRaw = formData.get("fileId");
  const fileId =
    fileIdRaw && typeof fileIdRaw === "string" && fileIdRaw !== ""
      ? parseInt(fileIdRaw, 10)
      : null;

  if (fileId === null || isNaN(fileId)) {
    return {
      success: false,
      error: i18next.t("import.errors.noFile"),
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

export default function ProjectImportExport() {
  const { organization, project, languages, projectFiles } =
    useOutletContext<ContextType>();
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
