import { processImport } from "~/lib/import/process-import.server";
import { orgContext } from "~/middleware/api-auth";
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.import";

export async function action({ request, params, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const organization = context.get(orgContext);

  // Parse multipart form data and process import
  const formData = await request.formData();

  const result = await processImport({
    organizationId: organization.id,
    projectSlug: params.projectSlug,
    formData,
  });

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: result.error,
        details: result.details,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      stats: result.importStats,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
