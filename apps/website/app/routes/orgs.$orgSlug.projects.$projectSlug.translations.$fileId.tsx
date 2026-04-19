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
import { LuPencil, LuPlus } from "react-icons/lu";
import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.translations.$fileId";
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
  getProjectFileById,
  createProjectFile,
  deleteProjectFile,
  updateProjectFile,
  isFilePathAvailable,
  DuplicateFilePathError,
} from "~/lib/project-files.server";
import { TranslationsSearchBar } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsSearchBar";
import { TranslationsTable } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsTable";
import { TranslationsPagination } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsPagination";
import {
  TranslationKeyModal,
  TRANSLATIONS_KEY_MODEL_MODE,
} from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationKeyModal";
import { FileManagementModal } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/FileManagementModal";
import { getInstance } from "~/middleware/i18next";
import {
  getKeyUrl,
  getTranslationsUrl,
  getTranslationsFileUrl,
} from "~/lib/routes-helpers";
import { TranslationKeysSort } from "~/lib/sort/keySort";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";
import { validateOutputPath } from "~/lib/path-utils";
import { SupportedFormat } from "@transi-store/common";
import { resolveSort } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/utils";

const LIMIT = 50;

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: { id: string; slug: string; name: string };
  languages: Array<{ id: string; locale: string; isDefault: boolean }>;
  projectFiles: Array<{ id: number; format: string; filePath: string }>;
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

  const fileId = parseInt(params.fileId, 10);
  if (isNaN(fileId)) {
    throw redirect(getTranslationsUrl(params.orgSlug, params.projectSlug));
  }

  const file = await getProjectFileById(project.id, fileId);
  if (!file) {
    throw redirect(getTranslationsUrl(params.orgSlug, params.projectSlug));
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const highlight = url.searchParams.get("highlight") || undefined;
  const sort = resolveSort(url.searchParams.get("sort"), Boolean(search));
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const offset = (page - 1) * LIMIT;

  const keys = await getTranslationKeys(project.id, {
    search,
    limit: LIMIT,
    offset,
    sort,
    fileId,
  });

  return { keys, search, highlight, page, sort, file };
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

  const fileId = parseInt(params.fileId, 10);

  const formData = await request.formData();
  const actionName = formData.get("_action");

  // --- File management actions ---

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
    if (pathError) return { error: pathError, action: "add_file" };

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
    const fileIdRaw = formData.get("fileId");
    const format = formData.get("fileFormat");
    const filePath = formData.get("fileOutput");

    if (!fileIdRaw || typeof fileIdRaw !== "string") {
      return {
        error: "L'identifiant du fichier est requis",
        action: "edit_file",
      };
    }
    const parsedFileId = parseInt(fileIdRaw, 10);
    if (isNaN(parsedFileId)) {
      return { error: "Identifiant de fichier invalide", action: "edit_file" };
    }

    const updates: { format?: SupportedFormat; filePath?: string } = {};

    if (format && typeof format === "string") {
      updates.format = format as SupportedFormat;
    }
    if (filePath && typeof filePath === "string" && filePath.trim() !== "") {
      const pathError = validateOutputPath(filePath.trim());
      if (pathError) return { error: pathError, action: "edit_file" };
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
    const fileIdRaw = formData.get("fileId");

    if (!fileIdRaw || typeof fileIdRaw !== "string") {
      return {
        error: "L'identifiant du fichier est requis",
        action: "delete_file",
      };
    }
    const parsedFileId = parseInt(fileIdRaw, 10);
    if (isNaN(parsedFileId)) {
      return {
        error: "Identifiant de fichier invalide",
        action: "delete_file",
      };
    }

    await deleteProjectFile(project.id, parsedFileId);

    // Redirect to translations index — it will redirect to remaining file or show list
    throw redirect(getTranslationsUrl(params.orgSlug, params.projectSlug));
  }

  // --- Translation key actions ---

  if (actionName === "duplicate") {
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

  if (actionName === "createKey") {
    const keyName = formData.get("keyName");
    const description = formData.get("description");

    if (!keyName || typeof keyName !== "string") {
      return {
        error: i18next.t("keys.new.errors.nameRequired"),
        action: "createKey",
      };
    }

    const existing = await getTranslationKeyByName(project.id, keyName, fileId);
    if (existing) {
      return {
        error: i18next.t("keys.new.errors.alreadyExists", { keyName }),
        action: "createKey",
      };
    }

    if (isNaN(fileId)) {
      return { error: i18next.t("keys.errors.noFile"), action: "createKey" };
    }

    await createTranslationKey({
      projectId: project.id,
      keyName,
      fileId,
      description:
        description && typeof description === "string"
          ? description
          : undefined,
    });

    return { success: true, keyName, action: "createKey" };
  }

  throw new Response(i18next.t("keys.errors.unknownAction"), { status: 400 });
}

export default function ProjectTranslationsFile({
  loaderData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const {
    keys: { data, count },
    search,
    highlight,
    page,
    sort,
    file,
  } = loaderData;
  const { organization, project, languages, projectFiles } =
    useOutletContext<ContextType>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [drawerKeyId, setDrawerKeyId] = useState<number | null>(null);

  const [fileModalState, setFileModalState] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | {
        open: true;
        mode: "edit";
        file: { id: number; filePath: string; format: string };
      }
  >({ open: false });

  const handleEditInDrawer = useCallback((keyId: number) => {
    setDrawerKeyId(keyId);
  }, []);

  const handleDrawerClosed = useCallback(() => {
    setDrawerKeyId(null);
  }, []);

  const currentUrl = getTranslationsFileUrl(
    organization.slug,
    project.slug,
    file.id,
    {
      search,
      sort,
      highlight,
    },
  );

  useEffect(() => {
    if (
      actionData?.success &&
      actionData.action === "createKey" &&
      navigation.state === "idle"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Close modal before navigating to the new key
      setIsCreateKeyModalOpen(false);

      navigate(
        getTranslationsFileUrl(organization.slug, project.slug, file.id, {
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
    file.id,
    navigate,
    highlight,
  ]);

  const totalLanguages = languages.length;

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
        {languages.length > 0 && (
          <Button
            colorPalette="accent"
            onClick={() => setIsCreateKeyModalOpen(true)}
            width={{ base: "full", sm: "auto" }}
          >
            <LuPlus /> {t("translations.newKey")}
          </Button>
        )}
      </Stack>

      {/* Tabs de fichiers avec boutons edit + add */}
      {projectFiles.length > 0 && (
        <Tabs.Root value={String(file.id)} variant="line">
          <Tabs.List>
            {projectFiles.map((f) => (
              <Tabs.Trigger key={f.id} value={String(f.id)} asChild>
                <HStack gap={1} pr={1}>
                  <Link
                    to={getTranslationsFileUrl(
                      organization.slug,
                      project.slug,
                      f.id,
                    )}
                  >
                    {f.filePath}
                  </Link>
                  <IconButton
                    size="2xs"
                    variant="ghost"
                    aria-label="Modifier le fichier"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFileModalState({ open: true, mode: "edit", file: f });
                    }}
                  >
                    <LuPencil />
                  </IconButton>
                </HStack>
              </Tabs.Trigger>
            ))}
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Ajouter un fichier"
              alignSelf="center"
              ml={1}
              onClick={() => setFileModalState({ open: true, mode: "create" })}
            >
              <LuPlus />
            </IconButton>
          </Tabs.List>
        </Tabs.Root>
      )}

      <TranslationsSearchBar
        search={search}
        sort={sort}
        organizationSlug={organization.slug}
        projectSlug={project.slug}
        fileId={file.id}
      />

      {languages.length === 0 ? (
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
            fileId={file.id}
          />
        </>
      )}

      {drawerKeyId !== null && (
        <TranslationKeyDrawer
          keyId={drawerKeyId}
          organizationSlug={organization.slug}
          projectSlug={project.slug}
          onClosed={handleDrawerClosed}
        />
      )}

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
        fileId={file.id}
      />

      <FileManagementModal
        isOpen={fileModalState.open}
        onOpenChange={(open) => !open && setFileModalState({ open: false })}
        mode={fileModalState.open ? fileModalState.mode : "create"}
        file={
          fileModalState.open && fileModalState.mode === "edit"
            ? fileModalState.file
            : undefined
        }
        onDeleted={() => {
          setFileModalState({ open: false });
          navigate(getTranslationsUrl(organization.slug, project.slug));
        }}
      />
    </VStack>
  );
}
