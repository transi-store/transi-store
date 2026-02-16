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
} from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPencil, LuSparkles } from "react-icons/lu";
import { IcuEditorClient } from "~/components/icu-editor";
import { getAiProvider } from "~/lib/ai-providers";
import {
  TranslationKeyModal,
  TRANSLATIONS_KEY_MODEL_MODE,
} from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationKeyModal";
import { Tooltip } from "~/components/ui/tooltip";
import { useTranslationKeyEditor } from "./useTranslationKeyEditor";
import type {
  TranslationKeyData,
  LanguageData,
  TranslationData,
  OrganizationRef,
  ProjectRef,
} from "./types";

type TranslationKeyContentProps = {
  translationKey: TranslationKeyData;
  languages: Array<LanguageData>;
  translations: Array<TranslationData>;
  organization: OrganizationRef;
  project: ProjectRef;
  hasAiProvider: boolean;
  /** URL to POST actions to. Defaults to current route (for the standalone page). */
  actionUrl?: string;
  /** Whether to show in compact layout (e.g. inside a drawer). */
  compact?: boolean;
  /** Callback when the number of active fetchers changes. */
  onFetcherStateChange?: (activeFetchers: number) => void;
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
  onFetcherStateChange,
}: TranslationKeyContentProps) {
  const { t } = useTranslation();

  const {
    translationValues,
    handleTranslationChange,
    handleTranslationBlur,
    handleRequestAiTranslation,
    handleSelectSuggestion,
    aiDialogLocale,
    setAiDialogLocale,
    aiFetcher,
    isEditKeyModalOpen,
    setIsEditKeyModalOpen,
    editKeyFetcher,
    isSaving,
  } = useTranslationKeyEditor({
    translationKey,
    languages,
    translations,
    organization,
    project,
    actionUrl,
    onFetcherStateChange,
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
          <Text color="yellow.700" fontWeight="medium">
            {t("translations.noLanguages")}
          </Text>
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
            {/* Default language first */}
            {languages
              .filter((lang) => lang.isDefault)
              .map((lang) => (
                <GridItem key={`lang-${lang.id}`}>
                  <LanguageEditor
                    lang={lang}
                    isDefault
                    value={translationValues[lang.locale] || ""}
                    onChange={(value) =>
                      handleTranslationChange(lang.locale, value)
                    }
                    onBlur={() => handleTranslationBlur(lang.locale)}
                    onRequestAi={() => handleRequestAiTranslation(lang.locale)}
                    hasAiProvider={hasAiProvider}
                    disabled={isSaving}
                  />
                </GridItem>
              ))}

            {/* Other languages */}
            {languages
              .filter((lang) => !lang.isDefault)
              .map((lang) => (
                <>
                  {compact && (
                    <GridItem key={`separator-${lang.id}`}>
                      <Separator />
                    </GridItem>
                  )}

                  <GridItem key={`lang-${lang.id}`}>
                    <LanguageEditor
                      lang={lang}
                      isDefault={false}
                      value={translationValues[lang.locale] || ""}
                      onChange={(value) =>
                        handleTranslationChange(lang.locale, value)
                      }
                      onBlur={() => handleTranslationBlur(lang.locale)}
                      onRequestAi={() =>
                        handleRequestAiTranslation(lang.locale)
                      }
                      hasAiProvider={hasAiProvider}
                      disabled={isSaving}
                    />
                  </GridItem>
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
        isSubmitting={editKeyFetcher.state !== "idle"}
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

// ─── Sub-components ──────────────────────────────────────────────────────────

type LanguageEditorProps = {
  lang: LanguageData;
  isDefault: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onRequestAi: () => void;
  hasAiProvider: boolean;
  disabled: boolean;
};

function LanguageEditor({
  lang,
  isDefault,
  value,
  onChange,
  onBlur,
  onRequestAi,
  hasAiProvider,
  disabled,
}: LanguageEditorProps) {
  const { t } = useTranslation();

  return (
    <Field.Root>
      <Field.Label>
        <HStack>
          <Text>{lang.locale.toUpperCase()}</Text>
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
      </Field.Label>
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
        showPreview={true}
      />
    </Field.Root>
  );
}

type AiSuggestionsDialogProps = {
  locale: string | null;
  onClose: () => void;
  onSelect: (text: string) => void;
  aiFetcher: ReturnType<
    typeof import("react-router").useFetcher<import("./types").AiFetcherData>
  >;
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
              ) : aiFetcher.data?.error ? (
                <Box p={4} bg="red.subtle" borderRadius="md">
                  <Text color="red.fg">{aiFetcher.data.error}</Text>
                </Box>
              ) : aiFetcher.data?.suggestions ? (
                <VStack align="stretch" gap={3}>
                  {aiFetcher.data.provider && (
                    <Text fontSize="xs" color="fg.subtle">
                      {t("keys.translateWithAI.generatedBy", {
                        provider: getAiProvider(aiFetcher.data.provider).name,
                      })}
                    </Text>
                  )}
                  {aiFetcher.data.suggestions.map((suggestion, index) => (
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
