import { ALL_BRANCHES_VALUE } from "@transi-store/common";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { getProjectFileById } from "~/lib/project-files.server";
import { getProjectTranslations } from "~/lib/translation-keys.server";
import { getBranchBySlug } from "~/lib/branches.server";
import { createTranslationFormat } from "~/lib/format/format-factory.server";
import { orgContext } from "~/middleware/api-auth";
import type { Route } from "./+types/api.orgs.$orgSlug.projects.$projectSlug.files.$fileId.translations";
import { exportQuerySchema } from "~/lib/api-doc/schemas/export";
import { processImport } from "~/lib/import/process-import.server";
import { getInstance } from "~/middleware/i18next";

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseFileId(raw: string): number | undefined {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const i18next = getInstance(context);
  const organization = context.get(orgContext);

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    return jsonError(
      404,
      i18next.t("projects.errors.notFound", {
        projectSlug: params.projectSlug,
      }),
    );
  }

  const fileId = parseFileId(params.fileId);
  if (fileId === undefined) {
    return jsonError(
      400,
      i18next.t("files.errors.invalidFileId", { fileId: params.fileId }),
    );
  }

  const file = await getProjectFileById(project.id, fileId);
  if (!file) {
    return jsonError(
      404,
      i18next.t("files.errors.fileNotFound", {
        fileId: params.fileId,
        projectSlug: params.projectSlug,
      }),
    );
  }

  const url = new URL(request.url);
  const queryParseResult = exportQuerySchema().safeParse({
    format: url.searchParams.get("format") ?? file.format,
    locale: url.searchParams.get("locale") ?? undefined,
    branch: url.searchParams.get("branch") ?? undefined,
  });

  if (!queryParseResult.success) {
    return jsonError(
      400,
      queryParseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    );
  }

  const {
    format: formatName,
    locale,
    branch: branchParam,
  } = queryParseResult.data;

  const languages = await getProjectLanguages(project.id);
  if (languages.length === 0) {
    return jsonError(400, i18next.t("import.errors.noLanguagesConfigured"));
  }

  const availableLocales = languages.map((l) => l.locale);
  if (!availableLocales.includes(locale)) {
    return jsonError(
      400,
      i18next.t("import.errors.localeNotInProject", { locale }),
    );
  }

  let branchId: number | undefined;
  const allBranches = branchParam === ALL_BRANCHES_VALUE;
  if (branchParam && !allBranches) {
    const branch = await getBranchBySlug(project.id, branchParam);
    if (branch) {
      branchId = branch.id;
    }
  }

  const projectTranslations = await getProjectTranslations(project.id, {
    branchId,
    allBranches,
    fileId: file.id,
  });

  const format = createTranslationFormat(formatName);
  const result = format.handleExportRequest({
    locale,
    projectTranslations,
    fileId: project.slug,
  });

  const filename = `${project.slug}-${file.id}-${locale}.${result.fileExtension}`;

  return new Response(result.content, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
  if (request.method !== "POST") {
    return jsonError(405, i18next.t("api.methodNotAllowed"));
  }

  const organization = context.get(orgContext);

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    return jsonError(
      404,
      i18next.t("projects.errors.notFound", {
        projectSlug: params.projectSlug,
      }),
    );
  }

  const fileId = parseFileId(params.fileId);
  if (fileId === undefined) {
    return jsonError(
      400,
      i18next.t("files.errors.invalidFileId", { fileId: params.fileId }),
    );
  }

  const file = await getProjectFileById(project.id, fileId);
  if (!file) {
    return jsonError(
      404,
      i18next.t("files.errors.fileNotFound", {
        fileId: params.fileId,
        projectSlug: params.projectSlug,
      }),
    );
  }

  const formData = await request.formData();

  const result = await processImport({
    organizationId: organization.id,
    projectSlug: params.projectSlug,
    formData,
    fileId: file.id,
  });

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: result.error, details: result.details }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({ success: true, stats: result.importStats }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
