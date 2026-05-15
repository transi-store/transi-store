import {
  Container,
  Heading,
  VStack,
  Button,
  Box,
  Text,
  HStack,
  Badge,
  Stack,
  Tabs,
  Input,
  Checkbox,
  Code,
} from "@chakra-ui/react";
import {
  Link,
  useActionData,
  useNavigation,
  useNavigate,
  redirect,
  Form,
} from "react-router";
import { FORMAT_LABELS, type SupportedFormat } from "@transi-store/common";
import { ProjectBreadcrumb } from "~/components/navigation/ProjectBreadcrumb";
import { useTranslation } from "react-i18next";
import {
  LuGitBranch,
  LuPlus,
  LuGitMerge,
  LuTrash2,
  LuSearch,
  LuUndo2,
} from "react-icons/lu";
import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug";
import {
  organizationContext,
  projectContext,
} from "~/middleware/project-access.server";
import { getProjectLanguages } from "~/lib/projects.server";
import {
  getBranchBySlug,
  deleteBranch,
  getBranchKeyDeletions,
  getBranchKeyDeletionCount,
  addKeyDeletionsToBranch,
  removeKeyDeletionFromBranch,
  searchMainKeysForDeletion,
} from "~/lib/branches.server";
import {
  getTranslationKeys,
  createTranslationKey,
  getTranslationKeyByName,
} from "~/lib/translation-keys.server";
import { getProjectFiles } from "~/lib/project-files.server";
import { TranslationKeyDrawer } from "~/components/translation-key";
import {
  TranslationKeyModal,
  TRANSLATIONS_KEY_MODEL_MODE,
} from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationKeyModal";
import { TranslationsTable } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsTable";
import { TranslationsPagination } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsPagination";
import { TranslationsSearchBar } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsSearchBar";
import { resolveSort, resolveFilter } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/loadTranslationKeys.server";
import { getInstance } from "~/middleware/i18next.server";
import {
  getBranchesUrl,
  getBranchMergeUrl,
  getBranchUrl,
} from "~/lib/routes-helpers";
import { BRANCH_STATUS } from "~/lib/branches";
import { KeyAction } from "~/components/translation-key/KeyAction";
import { BranchAction } from "./BranchAction";

const LIMIT = 50;

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const organization = context.get(organizationContext);
  const project = context.get(projectContext);

  const branch = await getBranchBySlug(project.id, params.branchSlug);
  if (!branch) {
    throw new Response("Branch not found", { status: 404 });
  }

  if (branch.status !== BRANCH_STATUS.OPEN) {
    throw redirect(getBranchesUrl(params.orgSlug, params.projectSlug));
  }

  const languages = await getProjectLanguages(project.id);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const highlight = url.searchParams.get("highlight") || undefined;
  const sort = resolveSort(url.searchParams.get("sort"), Boolean(search));
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const offset = (page - 1) * LIMIT;
  const deletionSearch = url.searchParams.get("deletionSearch") || undefined;
  const locale = url.searchParams.get("locale") || undefined;
  const filter = resolveFilter(url.searchParams.get("filter"));

  const projectFiles = await getProjectFiles(project.id);

  if (projectFiles.length === 0) {
    return {
      organization,
      project,
      branch,
      languages,
      keys: { data: [], count: 0 },
      projectFiles,
      selectedFileId: null,
      search,
      highlight,
      page,
      sort,
      deletionCount: 0,
      keyDeletions: [],
      deletionSearch,
      mainKeysResult: { data: [], count: 0 },
    };
  }

  const fileIdParam = url.searchParams.get("fileId");
  const parsedFileId = fileIdParam ? parseInt(fileIdParam, 10) : NaN;
  const selectedFile =
    !isNaN(parsedFileId) && projectFiles.find((f) => f.id === parsedFileId);

  if (!selectedFile) {
    throw redirect(
      getBranchUrl(params.orgSlug, params.projectSlug, params.branchSlug, {
        fileId: projectFiles[0].id,
        search,
        sort,
        highlight,
        page: page > 1 ? String(page) : undefined,
        locale,
        filter,
      }),
    );
  }

  const keys = await getTranslationKeys(project.id, {
    search,
    limit: LIMIT,
    offset,
    sort,
    branchId: branch.id,
    branchOnly: true,
    fileId: selectedFile.id,
    locale,
    filter,
  });

  const deletionCount = await getBranchKeyDeletionCount(branch.id, {
    fileId: selectedFile.id,
  });
  const keyDeletions = await getBranchKeyDeletions(branch.id, {
    fileId: selectedFile.id,
  });

  // Search main keys for deletion picker
  const mainKeysResult = deletionSearch
    ? await searchMainKeysForDeletion(project.id, branch.id, selectedFile.id, {
        search: deletionSearch,
        limit: LIMIT,
      })
    : { data: [], count: 0 };

  return {
    organization,
    project,
    branch,
    languages,
    keys,
    projectFiles,
    selectedFileId: selectedFile.id,
    search,
    highlight,
    page,
    sort,
    locale,
    filter,
    deletionCount,
    keyDeletions,
    deletionSearch,
    mainKeysResult,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
  const project = context.get(projectContext);

  const branch = await getBranchBySlug(project.id, params.branchSlug);
  if (!branch) {
    throw new Response("Branch not found", { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === KeyAction.Create) {
    const keyName = formData.get("keyName");
    const description = formData.get("description");
    const fileIdRaw = formData.get("fileId");

    if (!keyName || typeof keyName !== "string") {
      return {
        error: i18next.t("keys.new.errors.nameRequired"),
        action: KeyAction.Create,
      };
    }

    if (!fileIdRaw || typeof fileIdRaw !== "string") {
      return {
        error: i18next.t("files.errors.missingFileId"),
        action: KeyAction.Create,
      };
    }
    const fileId = parseInt(fileIdRaw, 10);
    if (isNaN(fileId)) {
      return {
        error: i18next.t("files.errors.invalidFileId", { fileId: fileIdRaw }),
        action: KeyAction.Create,
      };
    }

    const existing = await getTranslationKeyByName(project.id, keyName, fileId);
    if (existing) {
      return {
        error: i18next.t("keys.new.errors.alreadyExists", { keyName }),
        action: KeyAction.Create,
      };
    }

    const newKeyId = await createTranslationKey({
      projectId: project.id,
      keyName,
      description:
        description && typeof description === "string"
          ? description
          : undefined,
      branchId: branch.id,
      fileId,
    });

    return {
      success: true,
      keyId: newKeyId,
      keyName,
      search: keyName,
      action: KeyAction.Create,
    };
  }

  if (action === BranchAction.Close) {
    await deleteBranch(branch.id);
    return redirect(getBranchesUrl(params.orgSlug, params.projectSlug));
  }

  if (action === BranchAction.AddDeletions) {
    const keyIds = formData.getAll("keyIds");
    const validKeyIds = keyIds
      .map((id) => parseInt(String(id), 10))
      .filter((id) => !isNaN(id));

    if (validKeyIds.length > 0) {
      await addKeyDeletionsToBranch(branch.id, validKeyIds);
    }

    return { success: true, action: BranchAction.AddDeletions };
  }

  if (action === BranchAction.RemoveDeletion) {
    const keyId = formData.get("keyId");
    if (keyId) {
      await removeKeyDeletionFromBranch(branch.id, parseInt(String(keyId), 10));
    }

    return { success: true, action: BranchAction.RemoveDeletion };
  }

  throw new Response(i18next.t("keys.errors.unknownAction"), { status: 400 });
}

export default function BranchDetail({ loaderData }: Route.ComponentProps) {
  const {
    organization,
    project,
    branch,
    languages,
    keys: { data, count },
    projectFiles,
    selectedFileId,
    search,
    highlight,
    page,
    sort,
    locale,
    filter,
    deletionCount,
    keyDeletions,
    deletionSearch,
    mainKeysResult,
  } = loaderData;
  const { t } = useTranslation();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [drawerKeyId, setDrawerKeyId] = useState<number | null>(null);
  const [selectedKeyIds, setSelectedKeyIds] = useState<number[]>([]);

  const handleEditInDrawer = useCallback((keyId: number) => {
    setDrawerKeyId(keyId);
  }, []);

  const handleDrawerClosed = useCallback(() => {
    setDrawerKeyId(null);
  }, []);

  const totalLanguages = languages.length;

  const currentUrl = getBranchUrl(
    organization.slug,
    project.slug,
    branch.slug,
    {
      search,
      sort,
      highlight,
      fileId: selectedFileId,
      locale,
      filter,
    },
  );

  useEffect(() => {
    if (
      actionData?.success &&
      actionData.action === KeyAction.Create &&
      navigation.state === "idle"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCreateKeyModalOpen(false);

      // Open the drawer for the newly created key
      if (actionData.keyId) {
        setDrawerKeyId(actionData.keyId);
      }
    }
  }, [actionData, navigation.state]);

  // Reset selected keys after successful deletion marking
  const [prevActionData, setPrevActionData] = useState(actionData);
  if (actionData !== prevActionData) {
    setPrevActionData(actionData);
    if (
      actionData?.success &&
      actionData.action === BranchAction.AddDeletions
    ) {
      setSelectedKeyIds([]);
    }
  }

  return (
    <Container maxW="container.xl" py={5}>
      <VStack gap={6} align="stretch">
        <ProjectBreadcrumb
          organizationSlug={organization.slug}
          organizationName={organization.name}
          projectSlug={project.slug}
          projectName={project.name}
          items={[
            {
              label: t("branches.title"),
              to: getBranchesUrl(organization.slug, project.slug),
            },
            { label: branch.name, to: currentUrl },
          ]}
        />

        {/* Branch header */}
        <Stack
          direction={{ base: "column", sm: "row" }}
          justify="space-between"
          align={{ base: "stretch", sm: "center" }}
          gap={{ base: 3, sm: 0 }}
        >
          <Box>
            <HStack>
              <LuGitBranch />
              <Heading as="h2" size="lg">
                {branch.name}
              </Heading>
              <Badge colorPalette="green" size="sm">
                {t("branches.status.open")}
              </Badge>
            </HStack>
            {branch.description && (
              <Text color="fg.muted" mt={1}>
                {branch.description}
              </Text>
            )}
          </Box>
          <HStack gap={2} flexWrap="wrap">
            <Button asChild size="sm" colorPalette="purple" variant="outline">
              <Link
                to={getBranchMergeUrl(
                  organization.slug,
                  project.slug,
                  branch.slug,
                )}
              >
                <LuGitMerge /> {t("branches.merge")}
              </Link>
            </Button>
            <Form method="post">
              <input type="hidden" name="_action" value={BranchAction.Close} />
              <Button
                type="submit"
                size="sm"
                colorPalette="red"
                variant="outline"
                loading={isSubmitting}
                onClick={(e) => {
                  if (!confirm(t("branches.close.confirm"))) {
                    e.preventDefault();
                  }
                }}
              >
                <LuTrash2 /> {t("branches.close")}
              </Button>
            </Form>
          </HStack>
        </Stack>

        {projectFiles.length === 0 ? (
          <Box
            p={10}
            textAlign="center"
            borderWidth={1}
            borderRadius="lg"
            bg="bg.subtle"
          >
            <Text color="fg.muted">{t("files.noFiles")}</Text>
          </Box>
        ) : (
          <Tabs.Root
            value={selectedFileId !== null ? String(selectedFileId) : undefined}
            variant="line"
            size="sm"
          >
            <Tabs.List>
              {projectFiles.map((file) => (
                <Tabs.Trigger
                  key={file.id}
                  value={String(file.id)}
                  cursor="pointer"
                  onClick={() => {
                    if (file.id === selectedFileId) return;
                    navigate(
                      getBranchUrl(
                        organization.slug,
                        project.slug,
                        branch.slug,
                        {
                          fileId: file.id,
                          search,
                          sort,
                          highlight,
                          locale,
                          filter,
                        },
                      ),
                    );
                  }}
                >
                  <Code fontSize="xs">{file.filePath}</Code>
                  <Badge size="xs" ml={2}>
                    {FORMAT_LABELS[file.format as SupportedFormat] ??
                      file.format}
                  </Badge>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>
        )}

        {projectFiles.length > 0 && (
          <Tabs.Root defaultValue="additions">
            <Tabs.List>
              <Tabs.Trigger value="additions">
                <LuPlus />
                {t("branches.tabs.additions")}
                <Badge size="sm" variant="subtle" ml={1}>
                  {count}
                </Badge>
              </Tabs.Trigger>
              <Tabs.Trigger value="deletions">
                <LuTrash2 />
                {t("branches.tabs.deletions")}
                {deletionCount > 0 && (
                  <Badge size="sm" variant="subtle" colorPalette="red" ml={1}>
                    {deletionCount}
                  </Badge>
                )}
              </Tabs.Trigger>
            </Tabs.List>

            {/* Additions tab */}
            <Tabs.Content value="additions">
              <VStack gap={4} align="stretch" pt={4}>
                <Stack
                  direction={{ base: "column", sm: "row" }}
                  align={{ base: "stretch", sm: "start" }}
                  justify="space-between"
                  gap={3}
                >
                  <Box flex="1">
                    <TranslationsSearchBar
                      search={search}
                      sort={sort}
                      organizationSlug={organization.slug}
                      projectSlug={project.slug}
                      branchSlug={branch.slug}
                      fileId={selectedFileId ?? undefined}
                      languages={languages}
                      selectedLocale={locale}
                      filter={filter}
                    />
                  </Box>
                  {languages.length > 0 && projectFiles.length > 0 && (
                    <Button
                      colorPalette="accent"
                      onClick={() => setIsCreateKeyModalOpen(true)}
                      size="sm"
                      flexShrink={0}
                    >
                      <LuPlus /> {t("translations.newKey")}
                    </Button>
                  )}
                </Stack>

                {languages.length === 0 ? (
                  <Box
                    p={10}
                    textAlign="center"
                    borderWidth={1}
                    borderRadius="lg"
                  >
                    <Text color="fg.muted" mb={4}>
                      {t("translations.noLanguages")}
                    </Text>
                  </Box>
                ) : data.length === 0 ? (
                  <Box
                    p={8}
                    textAlign="center"
                    bg="bg.subtle"
                    borderRadius="md"
                  >
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
                      selectedLocale={locale}
                    />

                    <TranslationsPagination
                      count={count}
                      pageSize={LIMIT}
                      currentPage={page}
                      search={search}
                      sort={sort}
                      organizationSlug={organization.slug}
                      projectSlug={project.slug}
                      branchSlug={branch.slug}
                      fileId={selectedFileId ?? undefined}
                      locale={locale}
                      filter={filter}
                    />
                  </>
                )}
              </VStack>
            </Tabs.Content>

            {/* Deletions tab */}
            <Tabs.Content value="deletions">
              <VStack gap={6} align="stretch" pt={4}>
                {/* Search main keys for deletion */}
                <Box>
                  <Text fontWeight="semibold" mb={3}>
                    {t("branches.deletions.searchMainKeys")}
                  </Text>
                  <Form method="get">
                    {/* Preserve existing search params */}
                    {search && (
                      <input type="hidden" name="search" value={search} />
                    )}
                    <HStack>
                      <Input
                        name="deletionSearch"
                        placeholder={t("branches.deletions.search")}
                        defaultValue={deletionSearch ?? ""}
                        size="sm"
                      />
                      <Button type="submit" size="sm" colorPalette="accent">
                        <LuSearch />
                      </Button>
                    </HStack>
                  </Form>

                  {deletionSearch && mainKeysResult.data.length > 0 && (
                    <Form method="post">
                      <input
                        type="hidden"
                        name="_action"
                        value={BranchAction.AddDeletions}
                      />
                      {selectedKeyIds.map((id) => (
                        <input
                          key={id}
                          type="hidden"
                          name="keyIds"
                          value={String(id)}
                        />
                      ))}
                      <Box
                        mt={3}
                        borderWidth={1}
                        borderRadius="md"
                        p={3}
                        maxH="300px"
                        overflowY="auto"
                      >
                        <VStack align="stretch" gap={2}>
                          {mainKeysResult.data.map((key) => (
                            <HStack key={key.id}>
                              <Checkbox.Root
                                size="sm"
                                checked={selectedKeyIds.includes(key.id)}
                                onCheckedChange={(e) => {
                                  if (e.checked) {
                                    setSelectedKeyIds((prev) => [
                                      ...prev,
                                      key.id,
                                    ]);
                                  } else {
                                    setSelectedKeyIds((prev) =>
                                      prev.filter((id) => id !== key.id),
                                    );
                                  }
                                }}
                              >
                                <Checkbox.HiddenInput />
                                <Checkbox.Control />
                                <Checkbox.Label>
                                  <Text>{key.keyName}</Text>
                                </Checkbox.Label>
                              </Checkbox.Root>
                              {key.description && (
                                <Text fontSize="xs" color="fg.muted" truncate>
                                  {key.description}
                                </Text>
                              )}
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                      <Button
                        type="submit"
                        size="sm"
                        colorPalette="red"
                        mt={3}
                        loading={isSubmitting}
                        disabled={selectedKeyIds.length === 0}
                      >
                        <LuTrash2 /> {t("branches.deletions.markForDeletion")} (
                        {selectedKeyIds.length})
                      </Button>
                    </Form>
                  )}

                  {deletionSearch && mainKeysResult.data.length === 0 && (
                    <Box
                      mt={3}
                      p={4}
                      bg="bg.subtle"
                      borderRadius="md"
                      textAlign="center"
                    >
                      <Text color="fg.muted" fontSize="sm">
                        {t("branches.deletions.searchEmpty")}
                      </Text>
                    </Box>
                  )}
                </Box>

                {/* List of planned deletions */}
                <Box>
                  <Text fontWeight="semibold" mb={3}>
                    {t("branches.deletions.planned")}
                  </Text>
                  {keyDeletions.length === 0 ? (
                    <Box
                      p={6}
                      textAlign="center"
                      bg="bg.subtle"
                      borderRadius="md"
                    >
                      <Text color="fg.muted" fontSize="sm">
                        {t("branches.deletions.empty")}
                      </Text>
                    </Box>
                  ) : (
                    <VStack align="stretch" gap={2}>
                      {keyDeletions.map((key) => (
                        <HStack
                          key={key.id}
                          justify="space-between"
                          p={2}
                          borderWidth={1}
                          // borderRadius="md"
                          // borderColor="red.muted"
                          // bg="red.subtle"
                        >
                          <VStack align="start" gap={0}>
                            <Badge
                              size="sm"
                              variant="outline"
                              colorPalette="red"
                            >
                              {key.keyName}
                            </Badge>
                            {key.description && (
                              <Text fontSize="xs" color="fg.muted">
                                {key.description}
                              </Text>
                            )}
                          </VStack>
                          <Form method="post">
                            <input
                              type="hidden"
                              name="_action"
                              value={BranchAction.RemoveDeletion}
                            />
                            <input
                              type="hidden"
                              name="keyId"
                              value={String(key.id)}
                            />
                            <Button
                              type="submit"
                              size="xs"
                              variant="ghost"
                              colorPalette="accent"
                              loading={isSubmitting}
                            >
                              <LuUndo2 /> {t("branches.deletions.restore")}
                            </Button>
                          </Form>
                        </HStack>
                      ))}
                    </VStack>
                  )}
                </Box>
              </VStack>
            </Tabs.Content>
          </Tabs.Root>
        )}

        {drawerKeyId !== null && (
          <TranslationKeyDrawer
            keyId={drawerKeyId}
            organizationSlug={organization.slug}
            projectSlug={project.slug}
            redirectUrl={currentUrl}
            onClosed={handleDrawerClosed}
          />
        )}

        {selectedFileId !== null && (
          <TranslationKeyModal
            isOpen={isCreateKeyModalOpen}
            onOpenChange={setIsCreateKeyModalOpen}
            mode={TRANSLATIONS_KEY_MODEL_MODE.CREATE}
            error={
              actionData?.error && actionData.action === KeyAction.Create
                ? actionData.error
                : undefined
            }
            isSubmitting={isSubmitting}
            fileId={selectedFileId}
          />
        )}
      </VStack>
    </Container>
  );
}
