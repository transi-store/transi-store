import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { getProjectFiles } from "~/lib/project-files.server";
import { orgContext } from "~/middleware/api-auth.server";
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug";
import { getInstance } from "~/middleware/i18next.server";
import { apiError } from "~/lib/api-response.server";

export async function loader({ params, context }: Route.LoaderArgs) {
  const i18next = getInstance(context);

  const organization = context.get(orgContext);

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    return apiError(
      404,
      i18next.t("api.translate.projectNotFound", {
        projectSlug: params.projectSlug,
      }),
    );
  }

  const [files, languages] = await Promise.all([
    getProjectFiles(project.id),
    getProjectLanguages(project.id),
  ]);

  return Response.json({
    files: files.map((f) => ({
      id: f.id,
      format: f.format,
      filePath: f.filePath,
    })),
    languages: languages.map((l) => ({
      locale: l.locale,
      isDefault: l.isDefault,
    })),
  });
}
