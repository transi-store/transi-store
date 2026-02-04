import { VStack } from "@chakra-ui/react";
import { useActionData, useNavigation, useOutletContext } from "react-router";
import type { Route } from "./+types/index";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import {
  parseImportJSON,
  validateImportData,
  importTranslations,
} from "~/lib/import/json.server";
import { getInstance } from "~/middleware/i18next";
import ImportSection from "./Import";
import ExportSection from "./Export";
import type {
  Organization,
  Project,
  ProjectLanguage,
} from "../../../drizzle/schema";

type ContextType = {
  organization: Organization;
  project: Project;
  languages: Array<ProjectLanguage>;
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  return {};
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const user = await requireUser(request);
  const i18next = getInstance(context);

  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "import") {
    // 1. Validate file input
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return {
        error: i18next.t("import.errors.fileRequired"),
      };
    }

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      return {
        error: i18next.t("import.errors.invalidFormat"),
      };
    }

    // 2. Validate locale input
    const locale = formData.get("locale");
    if (!locale || typeof locale !== "string") {
      return {
        error: i18next.t("import.errors.localeRequired"),
      };
    }

    // 3. Validate strategy input
    const strategy = formData.get("strategy");
    if (strategy !== "overwrite" && strategy !== "skip") {
      return {
        error: i18next.t("import.errors.invalidStrategy"),
      };
    }

    // 4. Verify locale exists in project
    const languages = await getProjectLanguages(project.id);
    if (!languages.some((l) => l.locale === locale)) {
      return {
        error: i18next.t("import.errors.localeNotInProject", { locale }),
      };
    }

    // 5. Read file content
    let fileContent: string;
    try {
      fileContent = await file.text();
    } catch (error) {
      return {
        error: i18next.t("import.errors.unableToReadFile"),
      };
    }

    // 6. Parse JSON
    const parseResult = parseImportJSON(fileContent);
    if (!parseResult.success) {
      return {
        error: i18next.t("import.errors.parseError"),
        details: parseResult.error,
      };
    }

    // 7. Validate data structure
    const validationErrors = validateImportData(parseResult.data!);
    if (validationErrors.length > 0) {
      return {
        error: i18next.t("import.errors.invalidData"),
        details: validationErrors.join(", "),
      };
    }

    // 8. Import translations
    const result = await importTranslations({
      projectId: project.id,
      locale,
      data: parseResult.data!,
      strategy: strategy as "overwrite" | "skip",
    });

    if (!result.success) {
      return {
        error: i18next.t("import.errors.importFailed"),
        details: result.errors.join(", "),
      };
    }

    // 9. Return success with stats
    return {
      success: true,
      importStats: result.stats,
    };
  }

  return { error: i18next.t("import.errors.unknownAction") };
}

export default function ProjectImportExport() {
  const { organization, project, languages } = useOutletContext<ContextType>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <VStack gap={6} align="stretch">
      <ImportSection
        languages={languages}
        isSubmitting={isSubmitting}
        actionSuccess={actionData?.success}
        importStats={actionData?.success ? actionData.importStats : undefined}
        error={actionData?.success === false ? actionData.error : undefined}
        details={actionData?.success === false ? actionData.details : undefined}
      />

      <ExportSection
        languages={languages}
        organizationSlug={organization.slug}
        projectSlug={project.slug}
      />
    </VStack>
  );
}
