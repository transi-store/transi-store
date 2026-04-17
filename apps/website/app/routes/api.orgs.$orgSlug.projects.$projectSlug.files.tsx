import { orgContext } from "~/middleware/api-auth";
import { getProjectBySlug } from "~/lib/projects.server";
import { getProjectFiles } from "~/lib/project-files.server";
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.files";

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

  const files = await getProjectFiles(project.id);

  return new Response(
    JSON.stringify(
      files.map((f) => ({
        id: f.id,
        name: f.name,
        format: f.format,
        output: f.output,
      })),
    ),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
