import {
  Heading,
  VStack,
  Button,
  Box,
  Text,
  Stack,
  Tabs,
  HStack,
  IconButton,
  Badge,
  Code,
} from "@chakra-ui/react";
import {
  Link,
  useOutletContext,
  redirect,
  useActionData,
  useNavigation,
  useNavigate,
} from "react-router";
import { useTranslation } from "react-i18next";
import { LuPlus, LuPencil } from "react-icons/lu";
import { useState, useEffect, useCallback } from "react";
import {
  FORMAT_LABELS,
  SupportedFormat,
  isSupportedFormat,
} from "@transi-store/common";
import type { Route } from "./+types/index";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { TranslationKeyDrawer } from "~/components/translation-key";
import { getProjectBySlug } from "~/lib/projects.server";
import {
  getTranslationKeys,
  duplicateTranslationKey,
  createTranslationKey,
  getTranslationKeyByName,
} from "~/lib/translation-keys.server";
import {
  getProjectFiles,
  updateProjectFile,
  createProjectFile,
  DuplicateFilePathError,
} from "~/lib/project-files.server";
import { validateOutputPath } from "~/lib/path-utils";
import { TranslationsSearchBar } from "./TranslationsSearchBar";
import { TranslationsTable } from "./TranslationsTable";
import { TranslationsPagination } from "./TranslationsPagination";
import {
  TranslationKeyModal,
  TRANSLATIONS_KEY_MODEL_MODE,
} from "./TranslationKeyModal";
import { FileEditModal } from "./FileEditModal";
import { getInstance } from "~/middleware/i18next";
import { getKeyUrl, getTranslationsUrl } from "~/lib/routes-helpers";
import { TranslationKeysSort } from "~/lib/sort/keySort";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";

const LIMIT = 50;

export function resolveSort(
  sortParam: string | null,
  hasSearch: boolean,
): TranslationKeysSort {
  const sort = Object.values(TranslationKeysSort).includes(
    sortParam as TranslationKeysSort,
  )
    ? (sortParam as TranslationKeysSort)
    : undefined;
  if (!hasSearch && sort === TranslationKeysSort.RELEVANCE) {
    return TranslationKeysSort.ALPHABETICAL;
  }
  return (
    sort ??
    (hasSearch
      ? TranslationKeysSort.RELEVANCE
      : TranslationKeysSort.ALPHABETICAL)
  );
}

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: { id: string; slug: string; name: string };
  languages: Array<{ id: string; locale: string; isDefault: boolean }>;
};

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const highlight = url.searchParams.get("highlight") || undefined;
  const sort = resolveSort(url.searchParams.get("sort"), Boolean(search));
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const offset = (page - 1) * LIMIT;

  const projectFiles = await getProjectFiles(project.id);

  if (projectFiles.length === 0) {
    return {
      keys: { data: [], count: 0 },
      projectFiles,
      selectedFileId: null,
      search,
      highlight,
      page,
      sort,
    };
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

  const keys = await getTranslationKeys(project.id, {
    search,
    limit: LIMIT,
    offset,
    sort,
    fileId: selectedFile.id,
  });

  return {
    keys,
    projectFiles,
    selectedFileId: selectedFile.id,
    search,
    highlight,
    page,
    sort,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
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
  const action = formData.get("_action");

  if (action === "duplicate") {
    const keyId = formData.get("keyId");

    if (!keyId || typeof keyId !== "string") {
      throw new Response("Key ID is required", { status: 400 });
    }

    const parsedKeyId = parseInt(keyId, 10);

    if (isNaN(parsedKeyId)) {
      throw new Response("Invalid Key ID", { status: 400 });
    }

    const newKeyId = await duplicateTranslationKey(parsedKeyId);

    return redirect(getKeyUrl(params.orgSlug, params.projectSlug, newKeyId));
  }

  if (action === "createKey") {
    const keyName = formData.get("keyName");
    const description = formData.get("description");
    const fileIdRaw = formData.get("fileId");

    if (!keyName || typeof keyName !== "string") {
      return {
        error: i18next.t("keys.new.errors.nameRequired"),
        action: "createKey",
      };
    }

    if (!fileIdRaw || typeof fileIdRaw !== "string") {
      return {
        error: i18next.t("files.errors.missingFileId"),
        action: "createKey",
      };
    }
    const fileId = parseInt(fileIdRaw, 10);
    if (isNaN(fileId)) {
      return {
        error: i18next.t("files.errors.invalidFileId", { fileId: fileIdRaw }),
        action: "createKey",
      };
    }

    // Vérifier que la clé n'existe pas déjà
    const existing = await getTranslationKeyByName(project.id, keyName, fileId);
    if (existing) {
      return {
        error: i18next.t("keys.new.errors.alreadyExists", { keyName }),
        action: "createKey",
      };
    }

    // Créer la clé
    await createTranslationKey({
      projectId: project.id,
      keyName,
      description:
        description && typeof description === "string"
          ? description
          : undefined,
      fileId,
    });

    // Retourner le succès avec le nom de la clé (la navigation se fera côté client)
    return { success: true, keyName, search: keyName, action: "createKey" };
  }

  if (action === "create_file") {
    const filePath = formData.get("filePath");
    const fileFormat = formData.get("fileFormat");

    if (!filePath || typeof filePath !== "string") {
      return {
        error: i18next.t("files.errors.pathRequired"),
        action: "create_file",
      };
    }
    const pathError = validateOutputPath(filePath, i18next.t);
    if (pathError) {
      return { error: pathError, action: "create_file" };
    }

    if (
      !fileFormat ||
      typeof fileFormat !== "string" ||
      !isSupportedFormat(fileFormat)
    ) {
      return {
        error: i18next.t("files.errors.invalidFormat"),
        action: "create_file",
      };
    }

    try {
      const created = await createProjectFile(project.id, {
        filePath,
        format: fileFormat as SupportedFormat,
      });
      return { success: true, fileId: created.id, action: "create_file" };
    } catch (error) {
      if (error instanceof DuplicateFilePathError) {
        return {
          error: i18next.t("files.errors.duplicatePath", { filePath }),
          action: "create_file",
        };
      }
      throw error;
    }
  }

  if (action === "edit_file") {
    const fileId = formData.get("fileId");
    const filePath = formData.get("filePath");
    const fileFormat = formData.get("fileFormat");

    if (!fileId || typeof fileId !== "string") {
      return {
        error: i18next.t("files.errors.missingFileId"),
        action: "edit_file",
      };
    }
    const parsedFileId = parseInt(fileId, 10);
    if (isNaN(parsedFileId)) {
      return {
        error: i18next.t("files.errors.invalidFileId", { fileId }),
        action: "edit_file",
      };
    }

    if (!filePath || typeof filePath !== "string") {
      return {
        error: i18next.t("files.errors.pathRequired"),
        action: "edit_file",
      };
    }
    const pathError = validateOutputPath(filePath, i18next.t);
    if (pathError) {
      return { error: pathError, action: "edit_file" };
    }

    if (
      !fileFormat ||
      typeof fileFormat !== "string" ||
      !isSupportedFormat(fileFormat)
    ) {
      return {
        error: i18next.t("files.errors.invalidFormat"),
        action: "edit_file",
      };
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
          action: "edit_file",
        };
      }
      throw error;
    }

    return { success: true, action: "edit_file" };
  }

  throw new Response(i18next.t("keys.errors.unknownAction"), { status: 400 });
}

export default function ProjectTranslations({
  loaderData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const {
    keys: { data, count },
    projectFiles,
    selectedFileId,
    search,
    highlight,
    page,
    sort,
  } = loaderData;
  const { organization, project, languages } = useOutletContext<ContextType>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const editingFile = projectFiles.find((f) => f.id === editingFileId) ?? null;

  // Drawer state for inline editing
  const [drawerKeyId, setDrawerKeyId] = useState<number | null>(null);

  const handleEditInDrawer = useCallback((keyId: number) => {
    setDrawerKeyId(keyId);
  }, []);

  const handleDrawerClosed = useCallback(() => {
    setDrawerKeyId(null);
  }, []);

  const totalLanguages = languages.length;

  // Build redirect URL with current search params
  const currentUrl = getTranslationsUrl(organization.slug, project.slug, {
    search,
    sort,
    highlight,
    fileId: selectedFileId,
  });

  // Close modal and navigate after successful creation
  useEffect(() => {
    if (
      actionData?.success &&
      actionData.action === "createKey" &&
      navigation.state === "idle"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCreateKeyModalOpen(false);

      // Navigate to filter by the newly created key
      navigate(
        getTranslationsUrl(organization.slug, project.slug, {
          sort: TranslationKeysSort.CREATED_AT,
          highlight: highlight
            ? `${highlight},${actionData.keyName}`
            : actionData.keyName,
        }),
      );
    }
  }, [
    actionData,
    navigation.state,
    organization.slug,
    project.slug,
    navigate,
    highlight,
  ]);

  return (
    <VStack gap={6} align="stretch">
      <Stack
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "stretch", sm: "center" }}
        gap={{ base: 3, sm: 0 }}
      >
        <Box>
          <Heading as="h2" size="lg">
            {t("translations.title")}
          </Heading>
          <Text color="gray" mt={2}>
            {t("translations.count", { count })}
          </Text>
        </Box>
        {languages.length > 0 && projectFiles.length > 0 && (
          <Button
            colorPalette="accent"
            onClick={() => setIsCreateKeyModalOpen(true)}
            width={{ base: "full", sm: "auto" }}
          >
            <LuPlus /> {t("translations.newKey")}
          </Button>
        )}
      </Stack>

      {projectFiles.length === 0 ? (
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
          <Button
            colorPalette="accent"
            onClick={() => setIsCreateFileModalOpen(true)}
          >
            <LuPlus /> {t("files.addFile")}
          </Button>
        </Box>
      ) : (
        <Tabs.Root
          value={selectedFileId !== null ? String(selectedFileId) : undefined}
          variant="line"
          size="sm"
        >
          <HStack align="center" gap={2} wrap="wrap">
            <Tabs.List flex="1" minW={0}>
              {projectFiles.map((file) => (
                <HStack key={file.id} gap={0} align="center">
                  <Tabs.Trigger
                    value={String(file.id)}
                    cursor="pointer"
                    onClick={() => {
                      if (file.id === selectedFileId) return;
                      navigate(
                        getTranslationsUrl(organization.slug, project.slug, {
                          fileId: file.id,
                          search,
                          sort,
                          highlight,
                        }),
                      );
                    }}
                  >
                    <Code fontSize="xs">{file.filePath}</Code>
                    <Badge size="xs" ml={2}>
                      {FORMAT_LABELS[file.format as SupportedFormat] ??
                        file.format}
                    </Badge>
                  </Tabs.Trigger>
                  <IconButton
                    aria-label={t("files.editFile")}
                    size="xs"
                    variant="ghost"
                    onClick={() => setEditingFileId(file.id)}
                  >
                    <LuPencil />
                  </IconButton>
                </HStack>
              ))}
            </Tabs.List>
            <IconButton
              aria-label={t("files.addFile")}
              size="xs"
              variant="ghost"
              onClick={() => setIsCreateFileModalOpen(true)}
            >
              <LuPlus />
            </IconButton>
          </HStack>
        </Tabs.Root>
      )}

      {projectFiles.length > 0 && (
        <TranslationsSearchBar
          search={search}
          sort={sort}
          organizationSlug={organization.slug}
          projectSlug={project.slug}
          fileId={selectedFileId ?? undefined}
        />
      )}

      {projectFiles.length === 0 ? null : languages.length === 0 ? (
        <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="fg.muted" mb={4}>
            {t("translations.noLanguages")}
          </Text>
          <Button asChild colorPalette="brand">
            <Link
              to={`/orgs/${organization.slug}/projects/${project.slug}/settings`}
            >
              {t("translations.manageLanguages")}
            </Link>
          </Button>
        </Box>
      ) : data.length === 0 ? (
        <Box p={8} textAlign="center" bg="bg.subtle" borderRadius="md">
          <Text color="fg.muted">
            {search
              ? t("translations.noResultsForSearch")
              : t("translations.noKeysEmpty")}
          </Text>
        </Box>
      ) : (
        <>
          <TranslationsTable
            data={data}
            search={search}
            totalLanguages={totalLanguages}
            organizationSlug={organization.slug}
            projectSlug={project.slug}
            currentUrl={currentUrl}
            onEditInDrawer={handleEditInDrawer}
          />

          <TranslationsPagination
            count={count}
            pageSize={LIMIT}
            currentPage={page}
            search={search}
            sort={sort}
            organizationSlug={organization.slug}
            projectSlug={project.slug}
            fileId={selectedFileId ?? undefined}
          />
        </>
      )}

      {/* Drawer for inline key editing */}
      {drawerKeyId !== null && (
        <TranslationKeyDrawer
          keyId={drawerKeyId}
          organizationSlug={organization.slug}
          projectSlug={project.slug}
          onClosed={handleDrawerClosed}
        />
      )}

      {/* Modale de création de clé */}
      {selectedFileId !== null && (
        <TranslationKeyModal
          isOpen={isCreateKeyModalOpen}
          onOpenChange={setIsCreateKeyModalOpen}
          mode={TRANSLATIONS_KEY_MODEL_MODE.CREATE}
          error={
            actionData?.error && actionData.action === "createKey"
              ? actionData.error
              : undefined
          }
          isSubmitting={isSubmitting}
          fileId={selectedFileId}
        />
      )}

      {editingFile && (
        <FileEditModal
          isOpen={true}
          onOpenChange={(open) => {
            if (!open) setEditingFileId(null);
          }}
          file={editingFile}
        />
      )}

      <FileEditModal
        isOpen={isCreateFileModalOpen}
        onOpenChange={setIsCreateFileModalOpen}
      />
    </VStack>
  );
}
