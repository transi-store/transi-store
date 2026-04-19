import { orgContext } from "~/middleware/api-auth";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { getProjectFiles } from "~/lib/project-files.server";
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug";

export async function loader({ params, context }: Route.LoaderArgs) {
  const organization = context.get(orgContext);

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    return new Response(
      JSON.stringify({ error: `Project "${params.projectSlug}" not found` }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const [files, languages] = await Promise.all([
    getProjectFiles(project.id),
    getProjectLanguages(project.id),
  ]);

  return new Response(
    JSON.stringify({
      files: files.map((f) => ({
        id: f.id,
        format: f.format,
        filePath: f.filePath,
      })),
      languages: languages.map((l) => ({
        locale: l.locale,
        isDefault: l.isDefault,
      })),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
