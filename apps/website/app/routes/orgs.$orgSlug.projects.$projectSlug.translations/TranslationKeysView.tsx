import { Heading, VStack, Button, Box, Text, Stack } from "@chakra-ui/react";
import { Link, useActionData, useNavigate, useNavigation } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPlus } from "react-icons/lu";
import { useCallback, useEffect, useState } from "react";
import { TranslationKeyDrawer } from "~/components/translation-key";
import { KeyAction } from "~/components/translation-key/KeyAction";
import { getTranslationsUrl } from "~/lib/routes-helpers";
import { TranslationKeysSort } from "~/lib/sort/keySort";
import { TranslationsSearchBar } from "./TranslationsSearchBar";
import { TranslationsToolbar } from "./TranslationsToolbar";
import { TranslationsTable } from "./TranslationsTable";
import { TranslationsPagination } from "./TranslationsPagination";
import {
  TranslationKeyModal,
  TRANSLATIONS_KEY_MODEL_MODE,
} from "./TranslationKeyModal";
import { TRANSLATIONS_LIMIT } from "./constants";
import type { TranslationKeysLoaderData } from "./loadTranslationKeys.server";
import type { KeyActionData } from "./runKeyAction.server";

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: { id: string; slug: string; name: string };
  languages: Array<{ id: string; locale: string; isDefault: boolean }>;
};

type Props = {
  data: TranslationKeysLoaderData;
  context: ContextType;
};

export function TranslationKeysView({ data, context }: Props) {
  const { t } = useTranslation();
  const {
    keys,
    selectedFileId,
    search,
    highlight,
    page,
    sort,
    locale,
    filter,
    filterCounts,
  } = data;
  const { organization, project, languages } = context;
  const actionData = useActionData<KeyActionData | undefined>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [drawerKeyId, setDrawerKeyId] = useState<number | null>(null);

  const handleEditInDrawer = useCallback((keyId: number) => {
    setDrawerKeyId(keyId);
  }, []);

  const handleDrawerClosed = useCallback(() => {
    setDrawerKeyId(null);
  }, []);

  const totalLanguages = languages.length;
  const effectiveLocale =
    locale ??
    languages.find((l) => l.isDefault)?.locale ??
    languages[0]?.locale ??
    "";

  const currentUrl = getTranslationsUrl(organization.slug, project.slug, {
    search,
    sort,
    highlight,
    fileId: selectedFileId,
    locale,
    filter,
  });

  useEffect(() => {
    if (
      actionData &&
      "success" in actionData &&
      actionData.success &&
      actionData.action === KeyAction.Create &&
      navigation.state === "idle"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCreateKeyModalOpen(false);

      navigate(
        getTranslationsUrl(organization.slug, project.slug, {
          fileId: selectedFileId,
          sort: TranslationKeysSort.CREATED_AT,
          highlight: highlight
            ? `${highlight},${actionData.keyName}`
            : actionData.keyName,
          locale,
          filter,
        }),
      );

      if (actionData.keyId) {
        setDrawerKeyId(actionData.keyId);
      }
    }
  }, [
    actionData,
    navigation.state,
    organization.slug,
    project.slug,
    navigate,
    highlight,
    selectedFileId,
    locale,
    filter,
  ]);

  const createKeyError =
    actionData &&
    "error" in actionData &&
    actionData.action === KeyAction.Create
      ? actionData.error
      : undefined;

  return (
    <VStack gap={6} align="stretch">
      <Heading as="h2" size="lg">
        {t("translations.title")}
      </Heading>
      <Stack
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "stretch", sm: "center" }}
        gap={{ base: 3, sm: 0 }}
      >
        {languages.length > 0 && (
          <TranslationsToolbar
            languages={languages}
            effectiveLocale={effectiveLocale}
            filter={filter}
            filterCounts={filterCounts}
            onLocaleChange={(newLocale) =>
              navigate(
                getTranslationsUrl(organization.slug, project.slug, {
                  search,
                  sort,
                  fileId: selectedFileId ?? undefined,
                  locale: newLocale,
                  filter,
                }),
              )
            }
            onFilterChange={(newFilter) =>
              navigate(
                getTranslationsUrl(organization.slug, project.slug, {
                  search,
                  sort,
                  fileId: selectedFileId ?? undefined,
                  locale,
                  filter: newFilter,
                }),
              )
            }
          />
        )}
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

      <TranslationsSearchBar
        search={search}
        sort={sort}
        organizationSlug={organization.slug}
        projectSlug={project.slug}
        fileId={selectedFileId ?? undefined}
        languages={languages}
        selectedLocale={locale}
        filter={filter}
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
      ) : keys.data.length === 0 ? (
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
            data={keys.data}
            search={search}
            totalLanguages={totalLanguages}
            organizationSlug={organization.slug}
            projectSlug={project.slug}
            currentUrl={currentUrl}
            onEditInDrawer={handleEditInDrawer}
            selectedLocale={effectiveLocale}
          />

          <TranslationsPagination
            count={keys.count}
            pageSize={TRANSLATIONS_LIMIT}
            currentPage={page}
            search={search}
            sort={sort}
            organizationSlug={organization.slug}
            projectSlug={project.slug}
            fileId={selectedFileId ?? undefined}
            locale={locale}
            filter={filter}
          />
        </>
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

      <TranslationKeyModal
        isOpen={isCreateKeyModalOpen}
        onOpenChange={setIsCreateKeyModalOpen}
        mode={TRANSLATIONS_KEY_MODEL_MODE.CREATE}
        error={createKeyError}
        isSubmitting={isSubmitting}
        fileId={selectedFileId}
      />
    </VStack>
  );
}
