import { useState, useEffect, useCallback } from "react";
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
};

type ReturnType = {
  translationValues: Record<string, string>;
  fuzzyFlags: Record<string, boolean>;
  handleTranslationChange: (locale: string, value: string) => void;
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
};

export function useTranslationKeyEditor({
  translationKey,
  languages,
  translations,
  organization,
  project,
  actionUrl,
}: UseTranslationKeyEditorParams): ReturnType {
  const { t } = useTranslation();

  // Fetcher for AI-triggered saves (AI suggestion selection)
  const aiSaveFetcher = useFetcher();

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

  // Reset translation values only when navigating to a different key.
  // We intentionally do NOT react to `translations` changes (from loader
  // revalidation after a save) to avoid overwriting in-progress edits
  // in other locales — this prevents the race condition where saving
  // locale A wipes unsaved changes to locale B.
  useEffect(() => {
    const newMap = new Map(translations.map((t) => [t.locale, t.value]));
    const newFuzzyMap = new Map(translations.map((t) => [t.locale, t.isFuzzy]));
    const initial: Record<string, string> = {};
    const initialFuzzy: Record<string, boolean> = {};
    for (const lang of languages) {
      initial[lang.locale] = newMap.get(lang.locale) || "";
      initialFuzzy[lang.locale] = newFuzzyMap.get(lang.locale) || false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranslationValues(initial);
    setFuzzyFlags(initialFuzzy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationKey.id]);

  // Edit key modal state
  const [isEditKeyModalOpen, setIsEditKeyModalOpen] = useState(false);

  // Close modal after successful edit
  useEffect(() => {
    if (
      editKeyFetcher.data?.success &&
      editKeyFetcher.state === "idle" &&
      isEditKeyModalOpen
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditKeyModalOpen(false);
    }
  }, [editKeyFetcher.data, editKeyFetcher.state, isEditKeyModalOpen]);

  // AI translation state
  const [aiDialogLocale, setAiDialogLocale] = useState<string | null>(null);
  const aiFetcher = useFetcher<TranslateAction>();

  const handleTranslationChange = useCallback(
    (locale: string, value: string) => {
      setTranslationValues((prev) => ({ ...prev, [locale]: value }));
    },
    [],
  );

  const handleFuzzyChange = useCallback((locale: string, isFuzzy: boolean) => {
    setFuzzyFlags((prev) => ({ ...prev, [locale]: isFuzzy }));
  }, []);

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

        // Save the AI suggestion immediately via a dedicated fetcher
        aiSaveFetcher.submit(
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
                {aiDialogLocale}
              </Text>
              <Text>
                <strong>{t("key.save.value")}</strong>{" "}
                {text || t("key.save.empty")}
              </Text>
            </VStack>
          ),
        });
      }
    },
    [
      aiDialogLocale,
      handleTranslationChange,
      fuzzyFlags,
      actionUrl,
      aiSaveFetcher,
      translationKey.keyName,
      t,
    ],
  );

  return {
    translationValues,
    fuzzyFlags,
    handleTranslationChange,
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
  };
}
