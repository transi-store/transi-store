import type { AiProviderEnum } from "~/lib/ai-providers";

/**
 * Shared types for the translation key content component,
 * used both by the standalone page and the drawer.
 */

export type TranslationKeyData = {
  id: number;
  keyName: string;
  description: string | null;
  projectId: number;
};

export type LanguageData = {
  id: number;
  locale: string;
  isDefault: boolean | null;
};

export type TranslationData = {
  locale: string;
  value: string;
};

export type OrganizationRef = {
  id: number;
  slug: string;
  name: string;
};

export type ProjectRef = {
  id: number;
  slug: string;
  name: string;
};

export type TranslationSuggestionData = {
  text: string;
  confidence?: number | null;
  notes?: string | null;
};

export type AiFetcherData = {
  suggestions?: Array<TranslationSuggestionData>;
  provider?: AiProviderEnum;
  error?: string;
};
