import { useState, useEffect, useRef, useCallback } from "react";
import { useFetcher, type FetcherWithComponents } from "react-router";
import { useTranslation } from "react-i18next";
import { VStack, Text } from "@chakra-ui/react";
import { toaster } from "~/components/ui/toaster";
import type {
  ProjectLanguage,
  Translation,
  TranslationKey,
  Organization,
  Project,
} from "../../../drizzle/schema";
import type { TranslateAction } from "~/routes/api.orgs.$orgSlug.projects.$projectSlug.translate";

type UseTranslationKeyEditorParams = {
  translationKey: TranslationKey;
  languages: Array<ProjectLanguage>;
  translations: Array<Translation>;
  organization: Organization;
  project: Project;
  /** URL to POST actions to (save, editKey). Defaults to current route. */
  actionUrl?: string;
  /** Callback when the number of active fetchers changes. */
  onFetcherStateChange?: (activeFetchers: number) => void;
};

type ReturnType = {
  translationValues: Record<string, string>;
  fuzzyFlags: Record<string, boolean>;
  handleTranslationChange: (locale: string, value: string) => void;
  handleTranslationBlur: (locale: string) => void;
  handleFuzzyChange: (locale: string, isFuzzy: boolean) => void;
  handleRequestAiTranslation: (locale: string) => void;
  handleSelectSuggestion: (text: string) => void;

  // AI dialog state
  aiDialogLocale: string | null;
  setAiDialogLocale: (locale: string | null) => void;
  aiFetcher: FetcherWithComponents<TranslateAction>;

  // Edit key modal state
  isEditKeyModalOpen: boolean;
  setIsEditKeyModalOpen: (open: boolean) => void;
  editKeyFetcher: FetcherWithComponents<{
    success?: boolean;
    error?: string;
    action?: string;
  }>;

  // Save state
  isSaving: boolean;
};

export function useTranslationKeyEditor({
  translationKey,
  languages,
  translations,
  organization,
  project,
  actionUrl,
  onFetcherStateChange,
}: UseTranslationKeyEditorParams): ReturnType {
  const { t } = useTranslation();

  // Fetcher for auto-saving translations
  const saveFetcher = useFetcher();

  // Fetcher for editing key metadata
  const editKeyFetcher = useFetcher<{
    success?: boolean;
    error?: string;
    action?: string;
  }>();

  // Create a map of translations by locale for easier lookup
  const translationMap = new Map(translations.map((t) => [t.locale, t.value]));
  const fuzzyMap = new Map(translations.map((t) => [t.locale, t.isFuzzy]));

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

  // State for fuzzy flags
  const [fuzzyFlags, setFuzzyFlags] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const lang of languages) {
      initial[lang.locale] = fuzzyMap.get(lang.locale) || false;
    }
    return initial;
  });

  // Track original values to detect changes (initialized with initial translation values)
  const originalValuesRef = useRef<Record<string, string>>({
    ...translationValues,
  });

  // Reset translation values when key changes (adjusting state based on prop)
  const [prevTranslationKeyId, setPrevTranslationKeyId] = useState(
    translationKey.id,
  );
  if (prevTranslationKeyId !== translationKey.id) {
    const initial: Record<string, string> = {};
    const initialFuzzy: Record<string, boolean> = {};
    for (const lang of languages) {
      initial[lang.locale] = translationMap.get(lang.locale) || "";
      initialFuzzy[lang.locale] = fuzzyMap.get(lang.locale) || false;
    }
    setPrevTranslationKeyId(translationKey.id);
    setTranslationValues(initial);
    setFuzzyFlags(initialFuzzy);
  }

  // Sync originalValuesRef when key/translations change (ref update only, no setState)
  useEffect(() => {
    const newMap = new Map(translations.map((t) => [t.locale, t.value]));
    const initial: Record<string, string> = {};
    for (const lang of languages) {
      initial[lang.locale] = newMap.get(lang.locale) || "";
    }
    originalValuesRef.current = initial;
  }, [translationKey.id, languages, translations]);

  // Edit key modal state
  const [isEditKeyModalOpen, setIsEditKeyModalOpen] = useState(false);

  // Close modal after successful edit (adjusting state based on fetcher result)
  const editKeySuccess = !!(
    editKeyFetcher.data?.success && editKeyFetcher.state === "idle"
  );
  const [prevEditKeySuccess, setPrevEditKeySuccess] = useState(editKeySuccess);
  if (editKeySuccess !== prevEditKeySuccess) {
    setPrevEditKeySuccess(editKeySuccess);
    if (editKeySuccess && isEditKeyModalOpen) {
      setIsEditKeyModalOpen(false);
    }
  }

  // AI translation state
  const [aiDialogLocale, setAiDialogLocale] = useState<string | null>(null);
  const aiFetcher = useFetcher<TranslateAction>();

  // Track active fetchers
  useEffect(() => {
    const count =
      (saveFetcher.state !== "idle" ? 1 : 0) +
      (editKeyFetcher.state !== "idle" ? 1 : 0) +
      (aiFetcher.state !== "idle" ? 1 : 0);
    onFetcherStateChange?.(count);
  }, [
    saveFetcher.state,
    editKeyFetcher.state,
    aiFetcher.state,
    onFetcherStateChange,
  ]);

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
            isFuzzy: String(fuzzyFlags[locale] || false),
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
    [translationValues, fuzzyFlags, translationKey.keyName, actionUrl, saveFetcher, t],
  );

  const handleFuzzyChange = useCallback(
    (locale: string, isFuzzy: boolean) => {
      setFuzzyFlags((prev) => ({ ...prev, [locale]: isFuzzy }));

      // Auto-save when fuzzy flag changes
      const value = translationValues[locale];
      saveFetcher.submit(
        {
          _action: "saveTranslation",
          locale,
          value: value || "",
          isFuzzy: String(isFuzzy),
        },
        {
          method: "POST",
          ...(actionUrl ? { action: actionUrl } : {}),
        },
      );
    },
    [translationValues, actionUrl, saveFetcher],
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
            isFuzzy: String(fuzzyFlags[aiDialogLocale] || false),
          },
          {
            method: "POST",
            ...(actionUrl ? { action: actionUrl } : {}),
          },
        );
      }
    },
    [aiDialogLocale, handleTranslationChange, fuzzyFlags, actionUrl, saveFetcher],
  );

  return {
    translationValues,
    fuzzyFlags,
    handleTranslationChange,
    handleTranslationBlur,
    handleFuzzyChange,
    handleRequestAiTranslation,
    handleSelectSuggestion,

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
