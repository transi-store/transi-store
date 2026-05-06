import { Heading, VStack, Button, Box, Text } from "@chakra-ui/react";
import {
  redirect,
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router";
import { useTranslation } from "react-i18next";
import { LuPlus } from "react-icons/lu";
import { isDocumentFormat } from "@transi-store/common";
import type { Route } from "./+types/index";
import { maybeUserContext, requireUserFromContext } from "~/middleware/auth";
import {
  getOrganizationBySlug,
  requireOrganizationMembership,
} from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import { getProjectFiles } from "~/lib/project-files.server";
import { getInstance } from "~/middleware/i18next";
import {
  getTranslationsFilesUrl,
  getTranslationsUrl,
} from "~/lib/routes-helpers";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";
import { ProjectFileTabs } from "~/components/project-files/ProjectFileTabs";
import { FileEditModal } from "./FileEditModal";
import { TranslationKeysView } from "./TranslationKeysView";
import { DocumentTranslationsView } from "./DocumentTranslationsView";
import {
  translationKeysLoader,
  resolveSort,
} from "./loadTranslationKeys.server";
import { loadDocumentTranslations } from "./loadDocumentTranslations.server";
import {
  isMarkdownAction,
  runMarkdownAction,
} from "./runMarkdownAction.server";
import { isKeyAction, runKeyAction } from "./runKeyAction.server";
import type { ProjectFile } from "../../../drizzle/schema";
import { ProjectAccessRole } from "~/lib/project-visibility";
import { DocumentMode } from "./constants";

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: { id: string; slug: string; name: string };
  languages: Array<{ id: string; locale: string; isDefault: boolean }>;
  projectAccessRole: ProjectAccessRole;
};

type EmptyLoaderData = {
  mode: DocumentMode.Empty;
  projectFiles: Array<ProjectFile>;
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const organization = await getOrganizationBySlug(params.orgSlug);
  if (!organization) {
    throw new Response("Organization not found", { status: 404 });
  }

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const highlight = url.searchParams.get("highlight") || undefined;
  const sort = resolveSort(url.searchParams.get("sort"), Boolean(search));
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const projectFiles = await getProjectFiles(project.id);

  if (projectFiles.length === 0) {
    return {
      mode: DocumentMode.Empty,
      projectFiles,
    } satisfies EmptyLoaderData;
  }

  const fileIdParam = url.searchParams.get("fileId");
  const parsedFileId = fileIdParam ? parseInt(fileIdParam, 10) : NaN;
  const selectedFile =
    !isNaN(parsedFileId) && projectFiles.find((f) => f.id === parsedFileId);

  if (!selectedFile) {
    throw redirect(
      getTranslationsUrl(params.orgSlug, params.projectSlug, {
        fileId: projectFiles[0].id,
        search,
        sort,
        highlight,
        page: page > 1 ? String(page) : undefined,
      }),
    );
  }

  if (isDocumentFormat(selectedFile.format)) {
    return loadDocumentTranslations({
      projectId: project.id,
      projectFiles,
      selectedFile,
    });
  }

  return translationKeysLoader({
    projectId: project.id,
    projectFiles,
    selectedFileId: selectedFile.id,
    search,
    highlight,
    page,
    sort,
  });
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
  const maybeUser = context.get(maybeUserContext);
  const user = requireUserFromContext(maybeUser);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (isMarkdownAction(action)) {
    return runMarkdownAction({
      action,
      formData,
      projectId: project.id,
      organizationId: organization.id,
      projectSlug: params.projectSlug,
      i18next,
    });
  }

  if (isKeyAction(action)) {
    return runKeyAction({
      action,
      formData,
      projectId: project.id,
      orgSlug: params.orgSlug,
      projectSlug: params.projectSlug,
      i18next,
    });
  }

  throw new Response(i18next.t("keys.errors.unknownAction"), { status: 400 });
}

export default function ProjectTranslations({
  loaderData,
}: Route.ComponentProps) {
  const context = useOutletContext<ContextType>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const modal = searchParams.get("modal");
  const isCreateFileModalOpen = modal === "create-file";
  const editingFileId = (() => {
    if (!modal?.startsWith("edit-file-")) return null;
    const id = parseInt(modal.slice("edit-file-".length), 10);
    return isNaN(id) ? null : id;
  })();
  const editingFile =
    loaderData.mode === DocumentMode.Empty
      ? null
      : (loaderData.projectFiles.find((f) => f.id === editingFileId) ?? null);

  function openFileModal(type: string) {
    const next = new URLSearchParams(searchParams);
    next.set("modal", type);
    navigate(`?${next.toString()}`);
  }

  function closeFileModal() {
    const next = new URLSearchParams(searchParams);
    next.delete("modal");
    navigate(`?${next.toString()}`);
  }

  const filesActionUrl = getTranslationsFilesUrl(
    context.organization.slug,
    context.project.slug,
    loaderData.mode === DocumentMode.TranslationKeys
      ? {
          search: loaderData.search,
          sort: loaderData.sort,
          highlight: loaderData.highlight,
          fileId: loaderData.selectedFileId,
        }
      : loaderData.mode === DocumentMode.Document
        ? { fileId: loaderData.selectedFileId }
        : undefined,
  );

  const isFileModalOpen = isCreateFileModalOpen || editingFile !== null;
  const selectedFile =
    loaderData.mode === DocumentMode.Empty
      ? undefined
      : loaderData.projectFiles.find((f) => f.id === loaderData.selectedFileId);

  const canEdit = context.projectAccessRole === ProjectAccessRole.MEMBER;

  return (
    <VStack gap={6} align="stretch">
      {loaderData.mode === DocumentMode.Empty ? (
        <>
          <Box>
            <Heading as="h2" size="lg">
              {t("translations.title")}
            </Heading>
          </Box>

          <Box
            p={10}
            textAlign="center"
            borderWidth={1}
            borderRadius="lg"
            bg="bg.subtle"
          >
            <Text color="fg.muted" mb={4}>
              {t("files.noFiles")}
            </Text>
            {canEdit && (
              <Button
                colorPalette="accent"
                onClick={() => openFileModal("create-file")}
              >
                <LuPlus /> {t("files.addFile")}
              </Button>
            )}
          </Box>
        </>
      ) : (
        <>
          <ProjectFileTabs
            files={loaderData.projectFiles}
            selectedFileId={loaderData.selectedFileId}
            projectAccessRole={context.projectAccessRole}
            onFileClick={(file) => {
              if (file.id === loaderData.selectedFileId) return;
              navigate(
                getTranslationsUrl(
                  context.organization.slug,
                  context.project.slug,
                  {
                    fileId: file.id,
                    search:
                      loaderData.mode === DocumentMode.TranslationKeys
                        ? loaderData.search
                        : undefined,
                    sort:
                      loaderData.mode === DocumentMode.TranslationKeys
                        ? loaderData.sort
                        : undefined,
                    highlight:
                      loaderData.mode === DocumentMode.TranslationKeys
                        ? loaderData.highlight
                        : undefined,
                  },
                ),
              );
            }}
            onEditFile={(file) => openFileModal(`edit-file-${file.id}`)}
            onAddFile={() => openFileModal("create-file")}
          />

          {loaderData.mode === DocumentMode.Document && selectedFile ? (
            <DocumentTranslationsView
              data={loaderData}
              context={context}
              selectedFile={selectedFile}
            />
          ) : loaderData.mode === DocumentMode.TranslationKeys ? (
            <TranslationKeysView data={loaderData} context={context} />
          ) : null}
        </>
      )}

      <FileEditModal
        isOpen={isFileModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeFileModal();
          }
        }}
        file={editingFile}
        actionUrl={filesActionUrl}
      />
    </VStack>
  );
}
