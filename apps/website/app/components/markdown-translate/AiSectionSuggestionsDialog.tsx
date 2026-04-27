/**
 * Modal that shows AI suggestions for a markdown / MDX section. Mirrors the
 * `AiSuggestionsDialog` used for translation keys: same look, same flow,
 * same return shape (`TranslationSuggestion[]`). The user picks a variant
 * and it gets injected into the target editor.
 */
import {
  Badge,
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  HStack,
  Portal,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { LuSparkles } from "react-icons/lu";
import type { FetcherWithComponents } from "react-router";
import { getAiProvider } from "~/lib/ai-providers";
import {
  isMarkdownSectionSuccess,
  isMarkdownTranslateError,
  type MarkdownTranslateSectionAction,
} from "~/routes/api.orgs.$orgSlug.projects.$projectSlug.markdown-translate-section";

type Props = {
  open: boolean;
  targetLocale: string | null;
  onClose: () => void;
  onSelect: (text: string) => void;
  fetcher: FetcherWithComponents<MarkdownTranslateSectionAction>;
};

export function AiSectionSuggestionsDialog({
  open,
  targetLocale,
  onClose,
  onSelect,
  fetcher,
}: Props) {
  const { t } = useTranslation();
  const data = fetcher.data;
  const isLoading =
    fetcher.state === "submitting" || fetcher.state === "loading";

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      size="lg"
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
                  {targetLocale && (
                    <Badge colorPalette="purple">
                      {targetLocale.toUpperCase()}
                    </Badge>
                  )}
                </HStack>
              </DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger />
            <DialogBody pb={6}>
              {isLoading ? (
                <VStack py={8}>
                  <Spinner size="lg" />
                  <Text color="fg.muted">
                    {t("keys.translateWithAI.generating")}
                  </Text>
                </VStack>
              ) : isMarkdownTranslateError(data) ? (
                <Box p={4} bg="red.subtle" borderRadius="md">
                  <Text color="red.fg">
                    {data.error}
                    {data.originalError && (
                      <>
                        <br />
                        {data.originalError}
                      </>
                    )}
                  </Text>
                </Box>
              ) : isMarkdownSectionSuccess(data) ? (
                <VStack align="stretch" gap={3}>
                  {data.provider && (
                    <Text fontSize="xs" color="fg.subtle">
                      {t("keys.translateWithAI.generatedBy", {
                        provider: getAiProvider(data.provider).name,
                        model: data.providerModel,
                      })}
                    </Text>
                  )}
                  {data.suggestions.map((suggestion, index) => (
                    <Box
                      key={index}
                      p={4}
                      borderWidth={1}
                      borderRadius="md"
                      _hover={{ bg: "bg.muted", cursor: "pointer" }}
                      onClick={() => onSelect(suggestion.text)}
                    >
                      <Text
                        fontFamily="mono"
                        fontSize="sm"
                        whiteSpace="pre-wrap"
                      >
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
