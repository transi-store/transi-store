import {
  Heading,
  VStack,
  Button,
  Box,
  Text,
  Stack,
  Tabs,
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
import { LuPlus } from "react-icons/lu";
import { useState, useEffect, useCallback } from "react";
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
import { TranslationsSearchBar } from "./TranslationsSearchBar";
import { TranslationsTable } from "./TranslationsTable";
import { TranslationsPagination } from "./TranslationsPagination";
import {
  TranslationKeyModal,
  TRANSLATIONS_KEY_MODEL_MODE,
} from "./TranslationKeyModal";
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

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const highlight = url.searchParams.get("highlight") || undefined;
  const sort = resolveSort(url.searchParams.get("sort"), Boolean(search));
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const offset = (page - 1) * LIMIT;
  const fileIdParam = url.searchParams.get("fileId");
  const fileId = fileIdParam ? parseInt(fileIdParam, 10) : undefined;

  const keys = await getTranslationKeys(project.id, {
    search,
    limit: LIMIT,
    offset,
    sort,
    fileId: fileId !== undefined && !isNaN(fileId) ? fileId : undefined,
  });

  return { keys, search, highlight, page, sort, fileId: fileId ?? null };
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

    if (!keyName || typeof keyName !== "string") {
      return {
        error: i18next.t("keys.new.errors.nameRequired"),
        action: "createKey",
      };
    }

    // Vérifier que la clé n'existe pas déjà
    const existing = await getTranslationKeyByName(project.id, keyName);
    if (existing) {
      return {
        error: i18next.t("keys.new.errors.alreadyExists", { keyName }),
        action: "createKey",
      };
    }

    // Créer la clé
    const fileIdRaw = formData.get("fileId");
    const fileId = parseInt(String(fileIdRaw), 10);
    if (!fileId || isNaN(fileId)) {
      return {
        error: i18next.t("keys.errors.noFile"),
        action: "createKey",
      };
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

    // Retourner le succès avec le nom de la clé (la navigation se fera côté client)
    return { success: true, keyName, search: keyName, action: "createKey" };
  }

  throw new Response(i18next.t("keys.errors.unknownAction"), { status: 400 });
}

export default function ProjectTranslations({
  loaderData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const {
    keys: { data, count },
    search,
    highlight,
    page,
    sort,
    fileId,
  } = loaderData;
  const { organization, project, languages, projectFiles } =
    useOutletContext<ContextType>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);

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
    fileId: fileId ?? undefined,
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
          fileId: fileId ?? undefined,
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
    fileId,
  ]);

  const activeFileTab = fileId != null ? String(fileId) : "all";

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

      {/* File tabs (si le projet a plusieurs fichiers) */}
      {projectFiles.length > 0 && (
        <Tabs.Root
          value={activeFileTab}
          onValueChange={(details) => {
            const nextFileId =
              details.value === "all" ? undefined : Number(details.value);
            navigate(
              getTranslationsUrl(organization.slug, project.slug, {
                search,
                sort,
                fileId: nextFileId,
              }),
            );
          }}
          variant="line"
        >
          <Tabs.List>
            <Tabs.Trigger value="all">Tous les fichiers</Tabs.Trigger>
            {projectFiles.map((file) => (
              <Tabs.Trigger key={file.id} value={String(file.id)}>
                {file.filePath}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      )}

      <TranslationsSearchBar
        search={search}
        sort={sort}
        organizationSlug={organization.slug}
        projectSlug={project.slug}
        fileId={fileId ?? undefined}
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
            fileId={fileId ?? undefined}
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
      />
    </VStack>
  );
}
