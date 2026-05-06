import { redirect } from "react-router";
import { isSupportedFormat, SupportedFormat } from "@transi-store/common";
import type { Route } from "./+types/index";
import { projectContext } from "~/middleware/project-access.server";
import {
  createProjectFile,
  deleteProjectFile,
  DuplicateFilePathError,
  updateProjectFile,
} from "~/lib/project-files.server";
import { validateOutputPath } from "~/lib/path-utils";
import { getInstance } from "~/middleware/i18next.server";
import { getTranslationsUrl } from "~/lib/routes-helpers";
import { FileAction } from "../orgs.$orgSlug.projects.$projectSlug.translations/FileAction";

export type FileActionData = {
  error: string;
  action: FileAction;
};

export async function loader() {
  // Resource route: never rendered as a page. Redirect any GET to nowhere
  // useful so direct hits don't leak a blank UI.
  throw new Response(null, { status: 405 });
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
  const project = context.get(projectContext);

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === FileAction.Create) {
    const filePath = formData.get("filePath");
    const fileFormat = formData.get("fileFormat");

    if (!filePath || typeof filePath !== "string") {
      return {
        error: i18next.t("files.errors.pathRequired"),
        action: FileAction.Create,
      } satisfies FileActionData;
    }
    const pathError = validateOutputPath(filePath, i18next.t);
    if (pathError) {
      return {
        error: pathError,
        action: FileAction.Create,
      } satisfies FileActionData;
    }

    if (
      !fileFormat ||
      typeof fileFormat !== "string" ||
      !isSupportedFormat(fileFormat)
    ) {
      return {
        error: i18next.t("files.errors.invalidFormat"),
        action: FileAction.Create,
      } satisfies FileActionData;
    }

    try {
      const created = await createProjectFile(project.id, {
        filePath,
        format: fileFormat as SupportedFormat,
      });

      return redirect(
        getTranslationsUrl(params.orgSlug, params.projectSlug, {
          fileId: created.id,
        }),
      );
    } catch (error) {
      if (error instanceof DuplicateFilePathError) {
        return {
          error: i18next.t("files.errors.duplicatePath", { filePath }),
          action: FileAction.Create,
        } satisfies FileActionData;
      }
      throw error;
    }
  }

  if (action === FileAction.Edit) {
    const fileId = formData.get("fileId");
    const filePath = formData.get("filePath");
    const fileFormat = formData.get("fileFormat");

    if (!fileId || typeof fileId !== "string") {
      return {
        error: i18next.t("files.errors.missingFileId"),
        action: FileAction.Edit,
      } satisfies FileActionData;
    }
    const parsedFileId = parseInt(fileId, 10);
    if (isNaN(parsedFileId)) {
      return {
        error: i18next.t("files.errors.invalidFileId", { fileId }),
        action: FileAction.Edit,
      } satisfies FileActionData;
    }

    if (!filePath || typeof filePath !== "string") {
      return {
        error: i18next.t("files.errors.pathRequired"),
        action: FileAction.Edit,
      } satisfies FileActionData;
    }
    const pathError = validateOutputPath(filePath, i18next.t);
    if (pathError) {
      return {
        error: pathError,
        action: FileAction.Edit,
      } satisfies FileActionData;
    }

    if (
      !fileFormat ||
      typeof fileFormat !== "string" ||
      !isSupportedFormat(fileFormat)
    ) {
      return {
        error: i18next.t("files.errors.invalidFormat"),
        action: FileAction.Edit,
      } satisfies FileActionData;
    }

    try {
      await updateProjectFile(project.id, parsedFileId, {
        filePath,
        format: fileFormat as SupportedFormat,
      });
    } catch (error) {
      if (error instanceof DuplicateFilePathError) {
        return {
          error: i18next.t("files.errors.duplicatePath", { filePath }),
          action: FileAction.Edit,
        } satisfies FileActionData;
      }
      throw error;
    }

    const url = new URL(request.url);
    return redirect(
      getTranslationsUrl(params.orgSlug, params.projectSlug, {
        fileId: url.searchParams.get("fileId") ?? undefined,
        search: url.searchParams.get("search") || undefined,
        sort: url.searchParams.get("sort") || undefined,
        highlight: url.searchParams.get("highlight") || undefined,
      }),
    );
  }

  if (action === FileAction.Delete) {
    const fileId = formData.get("fileId");

    if (!fileId || typeof fileId !== "string") {
      return {
        error: i18next.t("files.errors.missingFileId"),
        action: FileAction.Delete,
      } satisfies FileActionData;
    }
    const parsedFileId = parseInt(fileId, 10);
    if (isNaN(parsedFileId)) {
      return {
        error: i18next.t("files.errors.invalidFileId", { fileId }),
        action: FileAction.Delete,
      } satisfies FileActionData;
    }

    await deleteProjectFile(project.id, parsedFileId);

    return redirect(getTranslationsUrl(params.orgSlug, params.projectSlug));
  }

  throw new Response(i18next.t("keys.errors.unknownAction"), { status: 400 });
}
