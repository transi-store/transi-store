import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import {
  getOrganizationByApiKey,
  updateApiKeyLastUsed,
} from "~/lib/api-keys.server";
import { processImport } from "~/lib/import/process-import.server";
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.import";

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Authenticate: API key or session
  const authHeader = request.headers.get("Authorization");
  let organization;

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);

    const org = await getOrganizationByApiKey(apiKey);
    if (!org) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (org.slug !== params.orgSlug) {
      return new Response(
        JSON.stringify({ error: "API key does not match organization" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    updateApiKeyLastUsed(apiKey).catch((err) => {
      console.error("Failed to update API key last used:", err);
    });

    organization = org;
  } else {
    const user = await requireUser(request);
    organization = await requireOrganizationMembership(user, params.orgSlug);
  }

  // Parse multipart form data and process import
  const formData = await request.formData();

  const result = await processImport({
    organizationId: organization.id,
    projectSlug: params.projectSlug,
    formData,
    branchSlug: formData.get("branch") as string | undefined,
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
