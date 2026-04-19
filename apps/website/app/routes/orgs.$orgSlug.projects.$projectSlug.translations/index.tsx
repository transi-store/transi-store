import {
  Heading,
  VStack,
  Button,
  Box,
  Text,
  HStack,
  Badge,
  Code,
} from "@chakra-ui/react";
import { useOutletContext, redirect } from "react-router";
import { LuPencil, LuPlus } from "react-icons/lu";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/index";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import {
  getProjectFiles,
  createProjectFile,
  deleteProjectFile,
  updateProjectFile,
  isFilePathAvailable,
  DuplicateFilePathError,
} from "~/lib/project-files.server";
import { validateOutputPath } from "~/lib/path-utils";
import { getTranslationsFileUrl } from "~/lib/routes-helpers";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";
import { SupportedFormat, FORMAT_LABELS } from "@transi-store/common";
import { FileManagementModal } from "./FileManagementModal";

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: { id: string; slug: string; name: string };
  languages: Array<{ id: string; locale: string; isDefault: boolean }>;
  projectFiles: Array<{ id: number; format: string; filePath: string }>;
};

export async function loader({ params, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const projectFiles = await getProjectFiles(project.id);

  if (projectFiles.length === 1) {
    throw redirect(
      getTranslationsFileUrl(
        params.orgSlug,
        params.projectSlug,
        projectFiles[0].id,
      ),
    );
  }

  return {};
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const formData = await request.formData();
  const actionName = formData.get("_action");

  if (actionName === "add_file") {
    const format = formData.get("fileFormat");
    const filePath = formData.get("fileOutput");

    if (!format || typeof format !== "string") {
      return { error: "Le format est requis", action: "add_file" };
    }
    if (!filePath || typeof filePath !== "string" || filePath.trim() === "") {
      return { error: "Le chemin est requis", action: "add_file" };
    }

    const pathError = validateOutputPath(filePath.trim());
    if (pathError) {
      return { error: pathError, action: "add_file" };
    }

    const available = await isFilePathAvailable(project.id, filePath.trim());
    if (!available) {
      return {
        error: `Un fichier avec le chemin "${filePath.trim()}" existe déjà dans ce projet`,
        action: "add_file",
      };
    }

    try {
      const newFile = await createProjectFile({
        projectId: project.id,
        format: format as SupportedFormat,
        filePath: filePath.trim(),
      });

      throw redirect(
        getTranslationsFileUrl(params.orgSlug, params.projectSlug, newFile.id),
      );
    } catch (error) {
      if (error instanceof DuplicateFilePathError) {
        return { error: error.message, action: "add_file" };
      }
      throw error;
    }
  }

  if (actionName === "edit_file") {
    const fileId = formData.get("fileId");
    const format = formData.get("fileFormat");
    const filePath = formData.get("fileOutput");

    if (!fileId || typeof fileId !== "string") {
      return {
        error: "L'identifiant du fichier est requis",
        action: "edit_file",
      };
    }
    const parsedFileId = parseInt(fileId, 10);
    if (isNaN(parsedFileId)) {
      return { error: "Identifiant de fichier invalide", action: "edit_file" };
    }

    const updates: { format?: SupportedFormat; filePath?: string } = {};

    if (format && typeof format === "string") {
      updates.format = format as SupportedFormat;
    }
    if (filePath && typeof filePath === "string" && filePath.trim() !== "") {
      const pathError = validateOutputPath(filePath.trim());
      if (pathError) {
        return { error: pathError, action: "edit_file" };
      }
      const available = await isFilePathAvailable(
        project.id,
        filePath.trim(),
        parsedFileId,
      );
      if (!available) {
        return {
          error: `Un fichier avec le chemin "${filePath.trim()}" existe déjà dans ce projet`,
          action: "edit_file",
        };
      }
      updates.filePath = filePath.trim();
    }

    await updateProjectFile(project.id, parsedFileId, updates);
    return { success: true, action: "edit_file" };
  }

  if (actionName === "delete_file") {
    const fileId = formData.get("fileId");

    if (!fileId || typeof fileId !== "string") {
      return {
        error: "L'identifiant du fichier est requis",
        action: "delete_file",
      };
    }
    const parsedFileId = parseInt(fileId, 10);
    if (isNaN(parsedFileId)) {
      return {
        error: "Identifiant de fichier invalide",
        action: "delete_file",
      };
    }

    await deleteProjectFile(project.id, parsedFileId);
    const remaining = await getProjectFiles(project.id);
    if (remaining.length === 1) {
      throw redirect(
        getTranslationsFileUrl(
          params.orgSlug,
          params.projectSlug,
          remaining[0].id,
        ),
      );
    }
    // 0 files remaining — let revalidation update the UI
    return { success: true, action: "delete_file" };
  }

  return { error: "Action invalide" };
}

export default function ProjectTranslationsIndex() {
  const { organization, project, languages, projectFiles } =
    useOutletContext<ContextType>();
  const { t } = useTranslation();

  const [modalState, setModalState] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | {
        open: true;
        mode: "edit";
        file: { id: number; filePath: string; format: string };
      }
  >({ open: false });

  function openCreate() {
    setModalState({ open: true, mode: "create" });
  }

  function openEdit(file: { id: number; filePath: string; format: string }) {
    setModalState({ open: true, mode: "edit", file });
  }

  function closeModal() {
    setModalState({ open: false });
  }

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between" align="center">
        <Box>
          <Heading as="h2" size="lg">
            {t("files.title")}
          </Heading>
          <Text color="fg.muted" mt={1} fontSize="sm">
            {t("files.description")}
          </Text>
        </Box>
        <Button
          colorPalette="brand"
          onClick={openCreate}
          width={{ base: "full", sm: "auto" }}
        >
          <LuPlus /> {t("files.add")}
        </Button>
      </HStack>

      {projectFiles.length === 0 ? (
        <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="fg.muted" mb={2} fontWeight="medium">
            {t("files.empty")}
          </Text>
          <Text color="fg.muted" fontSize="sm" mb={4}>
            {t("files.emptyDescription")}
          </Text>
          <Button colorPalette="brand" onClick={openCreate}>
            <LuPlus /> {t("files.add")}
          </Button>
        </Box>
      ) : (
        <VStack align="stretch" gap={2}>
          {projectFiles.map((file) => (
            <Box
              key={file.id}
              borderWidth={1}
              borderRadius="md"
              p={4}
              _hover={{ bg: "bg.subtle" }}
            >
              <HStack justify="space-between" align="center">
                <HStack gap={3} flex={1} minW={0}>
                  <Badge colorPalette="gray" size="sm" flexShrink={0}>
                    {FORMAT_LABELS[file.format as SupportedFormat] ??
                      file.format}
                  </Badge>
                  <Code fontSize="sm" truncate asChild>
                    <a
                      href={getTranslationsFileUrl(
                        organization.slug,
                        project.slug,
                        file.id,
                      )}
                    >
                      {file.filePath}
                    </a>
                  </Code>
                  <Text fontSize="sm" color="fg.muted" flexShrink={0}>
                    {t("files.languageCount", { count: languages.length })}
                  </Text>
                </HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEdit(file)}
                  flexShrink={0}
                >
                  <LuPencil />
                </Button>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}

      <FileManagementModal
        isOpen={modalState.open}
        onOpenChange={(open) => !open && closeModal()}
        mode={modalState.open ? modalState.mode : "create"}
        file={
          modalState.open && modalState.mode === "edit"
            ? modalState.file
            : undefined
        }
        onDeleted={closeModal}
      />
    </VStack>
  );
}
