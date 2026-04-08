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
  Spinner,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DialogBackdrop,
  DialogPositioner,
  Portal,
  Separator,
  Flex,
} from "@chakra-ui/react";
import { Switch } from "@chakra-ui/react/switch";
import { Link, useFetcher, type FetcherWithComponents } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPencil, LuSparkles, LuCircleAlert } from "react-icons/lu";
import { IcuEditorClient } from "~/components/icu-editor";
import { getAiProvider } from "~/lib/ai-providers";
import {
  TranslationKeyModal,
  TRANSLATIONS_KEY_MODEL_MODE,
} from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationKeyModal";
import { Tooltip } from "~/components/ui/tooltip";
import { toaster } from "~/components/ui/toaster";
import { useTranslationKeyEditor } from "./useTranslationKeyEditor";
import type {
  TranslationKey,
  Translation,
  ProjectLanguage,
  Organization,
  Project,
} from "../../../drizzle/schema";
import {
  isErrorReturnType,
  isSuggestionsReturnType,
  type TranslateAction,
} from "~/routes/api.orgs.$orgSlug.projects.$projectSlug.translate";
import { TranslationPreview } from "./TranslationPreview";
import { useCallback, useEffect, useRef, type JSX } from "react";

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
    pendingSaveLocales,
    clearPendingSave,
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
    editKeyFetcher.data?.error && editKeyFetcher.data?.action === "editKey"
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
                    translationKey={translationKey}
                    handleTranslationChange={handleTranslationChange}
                    value={translationValues[lang.locale] || ""}
                    isFuzzy={fuzzyFlags[lang.locale] || false}
                    handleFuzzyChange={handleFuzzyChange}
                    handleRequestAiTranslation={handleRequestAiTranslation}
                    hasAiProvider={hasAiProvider}
                    needsSave={pendingSaveLocales.has(lang.locale)}
                    onSaveTriggered={() => clearPendingSave(lang.locale)}
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
        locale={aiDialogLocale}
        onClose={() => setAiDialogLocale(null)}
        onSelect={handleSelectSuggestion}
        aiFetcher={aiFetcher}
      />
    </VStack>
  );
}

type LanguageDetailProps = {
  lang: ProjectLanguage;
  translationKey: TranslationKey;
  handleTranslationChange: (locale: string, value: string) => void;
  value: string;
  isFuzzy: boolean;
  handleFuzzyChange: (locale: string, isFuzzy: boolean) => void;
  handleRequestAiTranslation: (locale: string) => void;
  hasAiProvider: boolean;
  /** Whether a programmatic save is pending for this locale (fuzzy change, AI suggestion). */
  needsSave: boolean;
  /** Callback to clear the pending-save flag after the save has been triggered. */
  onSaveTriggered: () => void;
  actionUrl?: string;
};

function LanguageDetail({
  lang,
  translationKey,
  handleTranslationChange,
  value,
  isFuzzy,
  handleFuzzyChange,
  handleRequestAiTranslation,
  hasAiProvider,
  needsSave,
  onSaveTriggered,
  actionUrl,
}: LanguageDetailProps): JSX.Element {
  const { t } = useTranslation();
  const saveFetcher = useFetcher();

  // Track the last saved value to detect unsaved changes on blur
  const originalValueRef = useRef(value);

  // Keep refs to current values so the programmatic-save effect can read them
  // without depending on them (avoids re-firing on every keystroke).
  const valueRef = useRef(value);
  valueRef.current = value;
  const isFuzzyRef = useRef(isFuzzy);
  isFuzzyRef.current = isFuzzy;

  const handleChange = useCallback(
    (newValue: string): void => {
      handleTranslationChange(lang.locale, newValue);
    },
    [handleTranslationChange, lang.locale],
  );

  const doSave = useCallback(
    (currentValue: string, currentFuzzy: boolean) => {
      originalValueRef.current = currentValue;
      saveFetcher.submit(
        {
          _action: "saveTranslation",
          locale: lang.locale,
          value: currentValue || "",
          isFuzzy: String(currentFuzzy),
        },
        {
          method: "POST",
          ...(actionUrl ? { action: actionUrl } : {}),
        },
      );
      toaster.success({
        title: t("common.saveInProgress"),
        description: (
          <VStack align="start" gap={1}>
            <Text>
              <strong>{t("key.save.key")} </strong>
              {translationKey.keyName}
            </Text>
            <Text>
              <strong>{t("key.save.locale")}</strong>
              {lang.locale}
            </Text>
            <Text>
              <strong>{t("key.save.value")}</strong>{" "}
              {currentValue || t("key.save.empty")}
            </Text>
          </VStack>
        ),
      });
    },
    [saveFetcher, lang.locale, actionUrl, translationKey.keyName, t],
  );

  // Keep a ref to the latest doSave so the trigger effect doesn't need it as a dep
  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  const handleBlur = useCallback(() => {
    if (value !== originalValueRef.current) {
      doSave(value, isFuzzy);
    }
  }, [value, isFuzzy, doSave]);

  // Trigger a programmatic save when requested (fuzzy change or AI suggestion)
  useEffect(() => {
    if (needsSave) {
      doSaveRef.current(valueRef.current, isFuzzyRef.current);
      onSaveTriggered();
    }
  }, [needsSave, onSaveTriggered]);

  const isSaving = saveFetcher.state !== "idle";

  return (
    <GridItem key={`lang-${lang.id}`}>
      <LanguageEditor
        lang={lang}
        isDefault={!!lang.isDefault}
        value={value}
        isFuzzy={isFuzzy}
        onChange={handleChange}
        onBlur={handleBlur}
        onFuzzyChange={(fuzzy) => handleFuzzyChange(lang.locale, fuzzy)}
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

type AiSuggestionsDialogProps = {
  locale: string | null;
  onClose: () => void;
  onSelect: (text: string) => void;
  aiFetcher: FetcherWithComponents<TranslateAction>;
};

function AiSuggestionsDialog({
  locale,
  onClose,
  onSelect,
  aiFetcher,
}: AiSuggestionsDialogProps) {
  const { t } = useTranslation();

  return (
    <DialogRoot
      open={locale !== null}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
    >
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <HStack>
                  <LuSparkles />
                  <Text>{t("keys.translateWithAI.suggestionsTitle")}</Text>
                  {locale && (
                    <Badge colorPalette="purple">{locale.toUpperCase()}</Badge>
                  )}
                </HStack>
              </DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger />
            <DialogBody pb={6}>
              {aiFetcher.state === "submitting" ||
              aiFetcher.state === "loading" ? (
                <VStack py={8}>
                  <Spinner size="lg" />
                  <Text color="fg.muted">
                    {t("keys.translateWithAI.generating")}
                  </Text>
                </VStack>
              ) : isErrorReturnType(aiFetcher.data) ? (
                <Box p={4} bg="red.subtle" borderRadius="md">
                  <Text color="red.fg">
                    {aiFetcher.data.error}
                    <br />
                    {aiFetcher.data.originalError}
                  </Text>
                </Box>
              ) : isSuggestionsReturnType(aiFetcher.data) ? (
                <VStack align="stretch" gap={3}>
                  {aiFetcher.data.provider && (
                    <Text fontSize="xs" color="fg.subtle">
                      {t("keys.translateWithAI.generatedBy", {
                        provider: getAiProvider(aiFetcher.data.provider).name,
                        model: aiFetcher.data.providerModel,
                      })}
                    </Text>
                  )}
                  {aiFetcher.data.suggestions?.map((suggestion, index) => (
                    <Box
                      key={index}
                      p={4}
                      borderWidth={1}
                      borderRadius="md"
                      _hover={{ bg: "bg.muted", cursor: "pointer" }}
                      onClick={() => onSelect(suggestion.text)}
                    >
                      <Text fontFamily="mono" fontSize="sm">
                        {suggestion.text}
                      </Text>
                      {suggestion.confidence && (
                        <Text fontSize="xs" color="fg.subtle" mt={1}>
                          {t("keys.translateWithAI.confidence")}
                          {Math.round(suggestion.confidence * 100)}%
                        </Text>
                      )}
                      {suggestion.notes && (
                        <Box mt={2} p={2} bg="bg.subtle" borderRadius="sm">
                          <Text fontSize="xs" color="fg.muted">
                            {suggestion.notes}
                          </Text>
                        </Box>
                      )}
                    </Box>
                  ))}
                  <Text fontSize="xs" color="fg.subtle" mt={2}>
                    {t("keys.translateWithAI.clickOnSuggestion")}
                  </Text>
                </VStack>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {t("common.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
