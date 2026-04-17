import { orgContext } from "~/middleware/api-auth";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.languages";

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

  const languages = await getProjectLanguages(project.id);

  return new Response(
    JSON.stringify(
      languages.map((l) => ({
        locale: l.locale,
        isDefault: l.isDefault,
      })),
    ),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
