import { useState, useEffect, useCallback } from "react";
import { useFetcher, type FetcherWithComponents } from "react-router";
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
  /** Counter incremented each time a programmatic save is requested for a locale. */
  saveTriggers: Record<string, number>;
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
}: UseTranslationKeyEditorParams): ReturnType {
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

  // Counter per locale — incremented to signal a programmatic save is needed
  const [saveTriggers, setSaveTriggers] = useState<Record<string, number>>({});

  // Reset translation values when key/translations change (e.g. drawer navigation)
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
    setSaveTriggers({});
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
    // Signal LanguageDetail to save with the updated fuzzy flag
    setSaveTriggers((prev) => ({
      ...prev,
      [locale]: (prev[locale] ?? 0) + 1,
    }));
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
        // Signal LanguageDetail to save the AI-selected value
        setSaveTriggers((prev) => ({
          ...prev,
          [aiDialogLocale]: (prev[aiDialogLocale] ?? 0) + 1,
        }));
      }
    },
    [aiDialogLocale, handleTranslationChange],
  );

  return {
    translationValues,
    fuzzyFlags,
    saveTriggers,
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
