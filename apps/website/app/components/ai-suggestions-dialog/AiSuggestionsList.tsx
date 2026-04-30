import { VStack, Text, Box } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { type AiProviderEnum, getAiProvider } from "~/lib/ai-providers";
import type { TranslationSuggestion } from "~/lib/ai-translation.server";

type AiSuggestionsListProps = {
  suggestions: ReadonlyArray<TranslationSuggestion>;
  provider?: AiProviderEnum;
  providerModel?: string | null;
  /** When provided, each card becomes interactive and applies the suggestion. */
  onSelect?: (text: string) => void;
};
export function AiSuggestionsList({
  suggestions,
  provider,
  providerModel,
  onSelect,
}: AiSuggestionsListProps) {
  const { t } = useTranslation();
  const interactive = onSelect !== undefined;

  return (
    <VStack align="stretch" gap={3}>
      {provider && (
        <Text fontSize="xs" color="fg.subtle">
          {t("keys.translateWithAI.generatedBy", {
            provider: getAiProvider(provider).name,
            model: providerModel,
          })}
        </Text>
      )}
      {suggestions.map((suggestion, index) => (
        <Box
          key={index}
          p={4}
          borderWidth={1}
          borderRadius="md"
          _hover={
            interactive ? { bg: "bg.muted", cursor: "pointer" } : undefined
          }
          onClick={onSelect ? () => onSelect(suggestion.text) : undefined}
        >
          <Text fontFamily="mono" fontSize="sm" whiteSpace="pre-wrap">
            {suggestion.text}
          </Text>
          {suggestion.confidence !== undefined && (
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
  );
}
