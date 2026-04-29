/**
 * Action discriminator strings posted to the markdown translation route.
 * Mirrors the `FileAction` / `KeyAction` pattern used in the classic UI.
 */
export const MarkdownTranslateAction = {
  SaveContent: "saveContent",
  ToggleFuzzy: "toggleFuzzy",
  TranslateSection: "translateSection",
  TranslateDocument: "translateDocument",
} as const;

import type { TranslationSuggestion } from "~/lib/ai-translation.server";
import type { AiProviderEnum } from "~/lib/ai-providers";

// ---- AI translate response shapes (returned by the page action) ----

export type MarkdownAiSectionSuccess = {
  scope: "section";
  suggestions: TranslationSuggestion[];
  provider: AiProviderEnum;
  providerModel: string | null | undefined;
};

export type MarkdownAiDocumentSuccess = {
  scope: "document";
  translatedText: string;
};

export type MarkdownAiError = {
  error: string;
  originalError?: string;
};

export type MarkdownAiResponse =
  | MarkdownAiSectionSuccess
  | MarkdownAiDocumentSuccess
  | MarkdownAiError;

export function isMarkdownAiSectionSuccess(
  data: MarkdownAiResponse | undefined,
): data is MarkdownAiSectionSuccess {
  return !!data && (data as MarkdownAiSectionSuccess).scope === "section";
}

export function isMarkdownAiError(
  data: MarkdownAiResponse | undefined,
): data is MarkdownAiError {
  return !!data && (data as MarkdownAiError).error !== undefined;
}
