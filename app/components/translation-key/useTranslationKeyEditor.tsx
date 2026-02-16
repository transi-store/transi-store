import { useState, useEffect, useRef, useCallback } from "react";
import { useFetcher } from "react-router";
import { useTranslation } from "react-i18next";
import { VStack, Text } from "@chakra-ui/react";
import { toaster } from "~/components/ui/toaster";
import type {
  TranslationKeyData,
  LanguageData,
  TranslationData,
  OrganizationRef,
  ProjectRef,
  AiFetcherData,
} from "./types";

type UseTranslationKeyEditorParams = {
  translationKey: TranslationKeyData;
  languages: Array<LanguageData>;
  translations: Array<TranslationData>;
  organization: OrganizationRef;
  project: ProjectRef;
  /** URL to POST actions to (save, editKey). Defaults to current route. */
  actionUrl?: string;
  /** Callback when the number of active fetchers changes. */
  onFetcherStateChange?: (activeFetchers: number) => void;
};

export function useTranslationKeyEditor({
  translationKey,
  languages,
  translations,
  organization,
  project,
  actionUrl,
  onFetcherStateChange,
}: UseTranslationKeyEditorParams) {
  const { t } = useTranslation();

  // Fetcher for auto-saving translations
  const saveFetcher = useFetcher();

  // Fetcher for editing key metadata
  const editKeyFetcher = useFetcher<{
    success?: boolean;
    error?: string;
    action?: string;
  }>();

  // Track original values to detect changes
  const originalValuesRef = useRef<Record<string, string>>({});

  // Create a map of translations by locale for easier lookup
  const translationMap = new Map(translations.map((t) => [t.locale, t.value]));

  // State for translation values (for ICU editor)
  const [translationValues, setTranslationValues] = useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {};
    for (const lang of languages) {
      initial[lang.locale] = translationMap.get(lang.locale) || "";
    }
    return initial;
  });

  // Reset translation values when key/translations change (e.g. drawer navigation)
  useEffect(() => {
    const newMap = new Map(translations.map((t) => [t.locale, t.value]));
    const initial: Record<string, string> = {};
    for (const lang of languages) {
      initial[lang.locale] = newMap.get(lang.locale) || "";
    }
    setTranslationValues(initial);
    originalValuesRef.current = initial;
  }, [translationKey.id, languages, translations]);

  // Edit key modal state
  const [isEditKeyModalOpen, setIsEditKeyModalOpen] = useState(false);

  // Close modal after successful edit
  useEffect(() => {
    if (
      editKeyFetcher.data?.success &&
      editKeyFetcher.state === "idle" &&
      isEditKeyModalOpen
    ) {
      setIsEditKeyModalOpen(false);
    }
  }, [editKeyFetcher.data, editKeyFetcher.state, isEditKeyModalOpen]);

  // AI translation state
  const [aiDialogLocale, setAiDialogLocale] = useState<string | null>(null);
  const aiFetcher = useFetcher<AiFetcherData>();

  // Track active fetchers
  useEffect(() => {
    const count =
      (saveFetcher.state !== "idle" ? 1 : 0) +
      (editKeyFetcher.state !== "idle" ? 1 : 0) +
      (aiFetcher.state !== "idle" ? 1 : 0);
    onFetcherStateChange?.(count);
  }, [saveFetcher.state, editKeyFetcher.state, aiFetcher.state, onFetcherStateChange]);

  const handleTranslationChange = useCallback(
    (locale: string, value: string) => {
      setTranslationValues((prev) => ({ ...prev, [locale]: value }));
    },
    [],
  );

  const handleTranslationBlur = useCallback(
    (locale: string) => {
      const value = translationValues[locale];
      const originalValue = originalValuesRef.current[locale];

      // Only save if the value has changed
      if (value !== originalValue) {
        originalValuesRef.current[locale] = value;

        saveFetcher.submit(
          {
            _action: "saveTranslation",
            locale,
            value: value || "",
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
                {locale}
              </Text>
              <Text>
                <strong>{t("key.save.value")}</strong>{" "}
                {value || t("key.save.empty")}
              </Text>
            </VStack>
          ),
        });
      }
    },
    [translationValues, translationKey.keyName, actionUrl, saveFetcher, t],
  );

  const handleRequestAiTranslation = useCallback(
    (locale: string) => {
      setAiDialogLocale(locale);
      aiFetcher.submit(
        {
          keyId: String(translationKey.id),
          targetLocale: locale,
        },
        {
          method: "POST",
          action: `/api/orgs/${organization.slug}/projects/${project.slug}/translate`,
        },
      );
    },
    [translationKey.id, organization.slug, project.slug, aiFetcher],
  );

  const handleSelectSuggestion = useCallback(
    (text: string) => {
      if (aiDialogLocale) {
        handleTranslationChange(aiDialogLocale, text);
        setAiDialogLocale(null);

        // save the value
        saveFetcher.submit(
          {
            _action: "saveTranslation",
            locale: aiDialogLocale,
            value: text,
          },
          {
            method: "POST",
            ...(actionUrl ? { action: actionUrl } : {}),
          },
        );
      }
    },
    [
      aiDialogLocale,
      handleTranslationChange,
      actionUrl,
      saveFetcher,
    ],
  );

  const handleEditKeySubmit = useCallback(
    (formData: FormData) => {
      editKeyFetcher.submit(formData, {
        method: "POST",
        ...(actionUrl ? { action: actionUrl } : {}),
      });
    },
    [actionUrl, editKeyFetcher],
  );

  return {
    translationValues,
    handleTranslationChange,
    handleTranslationBlur,
    handleRequestAiTranslation,
    handleSelectSuggestion,
    handleEditKeySubmit,

    // AI dialog
    aiDialogLocale,
    setAiDialogLocale,
    aiFetcher,

    // Edit key modal
    isEditKeyModalOpen,
    setIsEditKeyModalOpen,
    editKeyFetcher,

    // Save state
    isSaving: saveFetcher.state !== "idle",
  };
}
