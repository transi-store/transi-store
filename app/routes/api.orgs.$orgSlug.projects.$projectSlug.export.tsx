import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { getProjectTranslations } from "~/lib/translation-keys.server";
import { getBranchBySlug } from "~/lib/branches.server";
import { createTranslationFormat } from "~/lib/format/format-factory.server";
import { orgContext } from "~/middleware/api-auth";
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.export";
import { isSupportedFormat, SupportedFormat } from "~/lib/format/types";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const organization = context.get(orgContext);

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const formatName = url.searchParams.get("format") || SupportedFormat.JSON;

  if (!isSupportedFormat(formatName)) {
    return new Response(
      JSON.stringify({
        error: "Invalid format. Use 'json' or 'xliff'",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Récupérer les langues du projet
  const languages = await getProjectLanguages(project.id);

  if (languages.length === 0) {
    return new Response(
      JSON.stringify({ error: "No languages configured for this project" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Resolve optional branch
  const branchParam = url.searchParams.get("branch");
  let branchId: number | undefined;
  if (branchParam) {
    const branch = await getBranchBySlug(project.id, branchParam);

    if (branch) {
      branchId = branch.id;
    }
  }

  // Récupérer toutes les traductions du projet (main + branche si spécifiée)
  const projectTranslations = await getProjectTranslations(project.id, {
    branchId,
  });

  const format = createTranslationFormat(formatName);
  const result = format.handleExportRequest({
    searchParams: url.searchParams,
    projectTranslations,
    projectName: project.name,
    availableLocales: languages.map((l) => l.locale),
  });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const filename = `${project.slug}-${url.searchParams.get("locale")}.${result.fileExtension}`;

  return new Response(result.content, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
