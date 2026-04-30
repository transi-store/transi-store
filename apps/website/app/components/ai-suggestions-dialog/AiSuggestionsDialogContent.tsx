import {
  DialogHeader,
  DialogTitle,
  HStack,
  Text,
  Badge,
  DialogBody,
  VStack,
  Spinner,
  Box,
  DialogFooter,
  Button,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { LuSparkles } from "react-icons/lu";
import { AiSuggestionsList } from "./AiSuggestionsList";
import type { TranslationSuggestion } from "~/lib/ai-translation.server";
import type { AiProviderEnum } from "~/lib/ai-providers";

type AiErrorShape = { error: string; originalError?: string };
type AiSuggestionsShape = {
  suggestions: Array<TranslationSuggestion>;
  provider?: AiProviderEnum;
  providerModel?: string | null;
};

export type AiSuggestionsData =
  | AiErrorShape
  | AiSuggestionsShape
  | Record<string, unknown>
  | undefined
  | null;

function isAiError(data: AiSuggestionsData): data is AiErrorShape {
  return !!data && typeof (data as AiErrorShape).error === "string";
}

function isAiSuggestions(data: AiSuggestionsData): data is AiSuggestionsShape {
  return !!data && Array.isArray((data as AiSuggestionsShape).suggestions);
}

type AiSuggestionsCardProps = {
  targetLocale: string | null;
  /** When provided, suggestion cards become clickable. */
  onSelect?: (text: string) => void;
  /** Wired to the footer "Close" button. */
  onClose?: () => void;
  isLoading?: boolean;
  data: AiSuggestionsData;
};
/**
 * Visual content of the AI suggestions dialog. Uses Chakra's
 * `DialogHeader`/`DialogTitle`/`DialogBody`/`DialogFooter` so theme tokens
 * (paddings, font sizes…) come from the dialog slot recipe — meaning a
 * `DialogRoot` ancestor is required for the styles context to be available.
 * The mockup mounts a (non-portaled) `DialogRoot` around it for that reason.
 */

export function AiSuggestionsDialogContent({
  targetLocale,
  onSelect,
  onClose,
  isLoading = false,
  data,
}: AiSuggestionsCardProps) {
  const { t } = useTranslation();

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <HStack>
            <LuSparkles />
            <Text>{t("keys.translateWithAI.suggestionsTitle")}</Text>
            {targetLocale && (
              <Badge colorPalette="purple">{targetLocale.toUpperCase()}</Badge>
            )}
          </HStack>
        </DialogTitle>
      </DialogHeader>
      <DialogBody>
        {isLoading ? (
          <VStack py={8}>
            <Spinner size="lg" />
            <Text color="fg.muted">{t("keys.translateWithAI.generating")}</Text>
          </VStack>
        ) : isAiError(data) ? (
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
        ) : isAiSuggestions(data) ? (
          <AiSuggestionsList
            suggestions={data.suggestions}
            provider={data.provider}
            providerModel={data.providerModel}
            onSelect={onSelect}
          />
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("common.close")}
        </Button>
      </DialogFooter>
    </>
  );
}
