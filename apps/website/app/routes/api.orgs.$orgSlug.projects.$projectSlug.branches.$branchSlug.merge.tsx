import { getProjectBySlug } from "~/lib/projects.server";
import { getBranchBySlug, mergeBranch } from "~/lib/branches.server";
import { MERGE_FAILURE_REASON } from "~/lib/branches";
import { orgContext } from "~/middleware/api-auth.server";
import { getInstance } from "~/middleware/i18next.server";
import { apiError } from "~/lib/api-response.server";
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.merge";

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);

  if (request.method !== "POST") {
    return apiError(405, i18next.t("api.methodNotAllowed"));
  }

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

  const branch = await getBranchBySlug(project.id, params.branchSlug);
  if (!branch) {
    return apiError(
      404,
      i18next.t("api.branchMerge.branchNotFound", {
        branchSlug: params.branchSlug,
      }),
    );
  }

  // API merges are not attributed to a specific user — `mergedBy` is always null.
  const result = await mergeBranch(branch.id, null);

  if (result.success) {
    return Response.json({
      success: true as const,
      keysMoved: result.keysMoved,
      keysDeleted: result.keysDeleted,
    });
  }

  switch (result.reason) {
    case MERGE_FAILURE_REASON.NOT_FOUND:
      return apiError(
        404,
        i18next.t("api.branchMerge.branchNotFound", {
          branchSlug: params.branchSlug,
        }),
      );
    case MERGE_FAILURE_REASON.NOT_OPEN:
      return apiError(
        400,
        i18next.t("api.branchMerge.branchNotOpen", {
          branchSlug: params.branchSlug,
        }),
      );
  }
}
