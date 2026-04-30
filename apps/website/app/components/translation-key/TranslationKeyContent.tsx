/**
 * TranslationKeyContent
 *
 * Shared component that renders the translation editing experience for a key.
 * Used both in the standalone key page and in the TranslationKeyDrawer.
 *
 * Responsibilities:
 * - Translation editors grid (ICU editors for each language)
 * - Auto-save on blur
 * - AI translation dialog
 * - Edit key name modal
 */
import {
  Heading,
  VStack,
  Button,
  Field,
  Box,
  HStack,
  Text,
  Badge,
  IconButton,
  SimpleGrid,
  GridItem,
  Separator,
  Flex,
} from "@chakra-ui/react";
import { Switch } from "@chakra-ui/react/switch";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPencil, LuSparkles, LuCircleAlert } from "react-icons/lu";
import { IcuEditorClient } from "~/components/icu-editor";
import AiSuggestionsDialog from "~/components/ai-suggestions-dialog";
import {
  TranslationKeyModal,
  TRANSLATIONS_KEY_MODEL_MODE,
} from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationKeyModal";
import { Tooltip } from "~/components/ui/tooltip";
import { useSaveTranslation } from "./useSaveTranslation";
import { useTranslationKeyEditor } from "./useTranslationKeyEditor";
import type {
  TranslationKey,
  Translation,
  ProjectLanguage,
  Organization,
  Project,
} from "../../../drizzle/schema";
import { TranslationPreview } from "./TranslationPreview";
import { useCallback, useState, type JSX } from "react";
import { KeyAction } from "./KeyAction";

type TranslationKeyContentProps = {
  translationKey: TranslationKey;
  languages: Array<ProjectLanguage>;
  translations: Array<Translation>;
  organization: Organization;
  project: Project;
  hasAiProvider: boolean;
  /** URL to POST actions to. Defaults to current route (for the standalone page). */
  actionUrl?: string;
  /** Whether to show in compact layout (e.g. inside a drawer). */
  compact?: boolean;
};

export function TranslationKeyContent({
  translationKey,
  languages,
  translations,
  organization,
  project,
  hasAiProvider,
  actionUrl,
  compact = false,
}: TranslationKeyContentProps) {
  const { t } = useTranslation();

  const {
    translationValues,
    fuzzyFlags,
    handleTranslationChange,
    handleFuzzyChange,
    handleRequestAiTranslation,
    handleSelectSuggestion,
    aiDialogLocale,
    setAiDialogLocale,
    aiFetcher,
    isEditKeyModalOpen,
    setIsEditKeyModalOpen,
    editKeyFetcher,
  } = useTranslationKeyEditor({
    translationKey,
    languages,
    translations,
    organization,
    project,
    actionUrl,
  });

  const editKeyError =
    editKeyFetcher.data?.error && editKeyFetcher.data?.action === KeyAction.Edit
      ? editKeyFetcher.data.error
      : undefined;

  return (
    <VStack gap={compact ? 4 : 6} align="stretch">
      {/* Key header */}
      <Box>
        <HStack gap={2} align="center">
          <Heading
            as={compact ? "h2" : "h1"}
            size={compact ? "lg" : "2xl"}
            fontFamily="mono"
          >
            {translationKey.keyName}
          </Heading>
          <IconButton
            size="sm"
            variant="ghost"
            onClick={() => setIsEditKeyModalOpen(true)}
            aria-label={t("keys.edit.aria")}
          >
            <LuPencil />
          </IconButton>
        </HStack>
        {!compact && (
          <Text color="fg.muted" mt={2}>
            {t("keys.projectLabel")}: {project.name}
          </Text>
        )}
        {translationKey.description && (
          <Text fontSize="sm" color="fg.subtle" mt={2}>
            {translationKey.description}
          </Text>
        )}
      </Box>

      {/* Translation editors */}
      {languages.length === 0 ? (
        <Box p={6} bg="yellow.50" borderRadius="md">
          <Text color="yellow.700">{t("translations.noLanguages")}</Text>
          <Button asChild colorPalette="yellow" mt={4}>
            <Link
              to={`/orgs/${organization.slug}/projects/${project.slug}/settings`}
            >
              {t("translations.manageLanguages")}
            </Link>
          </Button>
        </Box>
      ) : (
        <Box>
          <Heading
            as={compact ? "h3" : "h2"}
            size={compact ? "md" : "lg"}
            mb={4}
          >
            {t("translations.title")}
          </Heading>

          <SimpleGrid columns={compact ? 1 : { base: 1, md: 2 }} gap={6}>
            {/* Other languages */}
            {languages
              .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
              .map((lang, i) => (
                <>
                  {compact && i > 0 && (
                    <GridItem key={`separator-${lang.id}`}>
                      <Separator />
                    </GridItem>
                  )}

                  <LanguageDetail
                    key={`${translationKey.id}-${lang.locale}`}
                    lang={lang}
                    translationKeyName={translationKey.keyName}
                    handleTranslationChange={handleTranslationChange}
                    value={translationValues[lang.locale] || ""}
                    isFuzzy={fuzzyFlags[lang.locale] || false}
                    handleFuzzyChange={handleFuzzyChange}
                    handleRequestAiTranslation={handleRequestAiTranslation}
                    hasAiProvider={hasAiProvider}
                    actionUrl={actionUrl}
                  />
                </>
              ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Edit key modal */}
      <TranslationKeyModal
        isOpen={isEditKeyModalOpen}
        onOpenChange={setIsEditKeyModalOpen}
        mode={TRANSLATIONS_KEY_MODEL_MODE.EDIT}
        defaultValues={{
          keyName: translationKey.keyName,
          description: translationKey.description || "",
        }}
        error={editKeyError}
        isSubmitting={editKeyFetcher.state === "submitting"}
        actionUrl={actionUrl}
        fetcher={editKeyFetcher}
      />

      {/* AI suggestions dialog */}
      <AiSuggestionsDialog
        open={aiDialogLocale !== null}
        targetLocale={aiDialogLocale}
        onClose={() => setAiDialogLocale(null)}
        onSelect={handleSelectSuggestion}
        isLoading={
          aiFetcher.state === "submitting" || aiFetcher.state === "loading"
        }
        data={aiFetcher.data}
      />
    </VStack>
  );
}

type LanguageDetailProps = {
  lang: ProjectLanguage;
  translationKeyName: string;
  handleTranslationChange: (locale: string, value: string) => void;
  value: string;
  isFuzzy: boolean;
  handleFuzzyChange: (locale: string, isFuzzy: boolean) => void;
  handleRequestAiTranslation: (locale: string) => void;
  hasAiProvider: boolean;
  actionUrl?: string;
};

/**
 * Each LanguageDetail owns its own `useFetcher()` so that concurrent saves
 * for different locales are independent (no race conditions).
 *
 * The component is rendered with `key={translationKey.id}-${lang.locale}`
 * so it remounts (and resets `lastSavedValue`) when navigating to a
 * different translation key.
 */
function LanguageDetail({
  lang,
  translationKeyName,
  handleTranslationChange,
  value,
  isFuzzy,
  handleFuzzyChange,
  handleRequestAiTranslation,
  hasAiProvider,
  actionUrl,
}: LanguageDetailProps): JSX.Element {
  const { submitSave: saveTranslation, isSaving } = useSaveTranslation({
    actionUrl,
    keyName: translationKeyName,
  });

  // Track the last saved value to detect unsaved changes on blur.
  // Initialised from the current `value` prop; auto-resets when the
  // parent remounts this component via `key` prop change.
  const [lastSavedValue, setLastSavedValue] = useState(value);

  const submitSave = useCallback(
    (saveValue: string, saveFuzzy: boolean) => {
      setLastSavedValue(saveValue);
      saveTranslation(lang.locale, saveValue, saveFuzzy);
    },
    [saveTranslation, lang.locale],
  );

  const handleChange = useCallback(
    (newValue: string): void => {
      handleTranslationChange(lang.locale, newValue);
    },
    [handleTranslationChange, lang.locale],
  );

  const handleBlur = useCallback(() => {
    if (value !== lastSavedValue) {
      submitSave(value, isFuzzy);
    }
  }, [value, lastSavedValue, isFuzzy, submitSave]);

  const handleFuzzyToggle = useCallback(
    (newFuzzy: boolean) => {
      handleFuzzyChange(lang.locale, newFuzzy);
      submitSave(value, newFuzzy);
    },
    [handleFuzzyChange, lang.locale, value, submitSave],
  );

  return (
    <GridItem key={`lang-${lang.id}`}>
      <LanguageEditor
        lang={lang}
        isDefault={!!lang.isDefault}
        value={value}
        isFuzzy={isFuzzy}
        onChange={handleChange}
        onBlur={handleBlur}
        onFuzzyChange={handleFuzzyToggle}
        onRequestAi={() => handleRequestAiTranslation(lang.locale)}
        hasAiProvider={hasAiProvider}
        disabled={isSaving}
      />
    </GridItem>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type LanguageEditorProps = {
  lang: ProjectLanguage;
  isDefault: boolean;
  value: string;
  isFuzzy: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onFuzzyChange: (isFuzzy: boolean) => void;
  onRequestAi: () => void;
  hasAiProvider: boolean;
  disabled: boolean;
};

function LanguageEditor({
  lang,
  isDefault,
  value,
  isFuzzy,
  onChange,
  onBlur,
  onFuzzyChange,
  onRequestAi,
  hasAiProvider,
  disabled,
}: LanguageEditorProps) {
  const { t } = useTranslation();

  return (
    <Field.Root>
      <Flex justify="space-between" wrap="wrap" gap={2} w="full">
        <HStack>
          <Text>{lang.locale.toUpperCase()}</Text>
          {isFuzzy && (
            <Tooltip content={t("translations.fuzzyTooltip")}>
              <LuCircleAlert color="orange" />
            </Tooltip>
          )}
          <Tooltip
            content={t("keys.translateWithAI.noProvider")}
            present={!hasAiProvider}
          >
            <Button
              size="xs"
              variant="ghost"
              colorPalette="purple"
              onClick={onRequestAi}
              disabled={disabled || !hasAiProvider}
            >
              <LuSparkles /> {t("keys.translateWithAI")}
            </Button>
          </Tooltip>
          {isDefault && (
            <Badge colorPalette="brand" size="sm">
              {t("translations.badgeDefault")}
            </Badge>
          )}
        </HStack>

        <Switch.Root
          checked={isFuzzy}
          onCheckedChange={(e: { checked: boolean }) =>
            onFuzzyChange(e.checked)
          }
          disabled={disabled}
          size="sm"
        >
          <Switch.HiddenInput />
          <Switch.Label>
            <Text fontSize="sm" color="fg.muted">
              {t("translations.markAsFuzzy")}
            </Text>
          </Switch.Label>
          <Switch.Control />
        </Switch.Root>
      </Flex>
      <IcuEditorClient
        name={`translation_${lang.locale}`}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={t("keys.translation.placeholder", {
          locale: lang.locale,
        })}
        disabled={disabled}
        locale={lang.locale}
      />

      {/* Preview panel */}
      {value && (
        <Box borderWidth={1} borderRadius="md" overflow="hidden" w="full">
          <TranslationPreview value={value} locale={lang.locale} />
        </Box>
      )}
    </Field.Root>
  );
}
