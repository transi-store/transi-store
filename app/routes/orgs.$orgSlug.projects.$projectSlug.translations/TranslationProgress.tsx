import { HStack, Text, Progress, Badge, VStack } from "@chakra-ui/react";

type TranslationProgressProps = {
  translatedCount: number;
  totalLanguages: number;
  translatedLocales: string[];
};

export function TranslationProgress({
  translatedCount,
  totalLanguages,
  translatedLocales,
}: TranslationProgressProps) {
  const progressPercent =
    totalLanguages > 0 ? (translatedCount / totalLanguages) * 100 : 0;

  return (
    <VStack align="stretch" gap={2}>
      <HStack justify="space-between" fontSize="sm">
        <Text color="gray.600">
          {translatedCount}/{totalLanguages}
        </Text>
        <Text color="gray.600">{Math.round(progressPercent)}%</Text>
      </HStack>
      <Progress.Root value={progressPercent} size="sm" colorPalette="brand">
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
      {translatedLocales.length > 0 && (
        <HStack gap={1} flexWrap="wrap">
          {translatedLocales.map((locale) => (
            <Badge key={locale} size="sm" colorPalette="brand">
              {locale.toUpperCase()}
            </Badge>
          ))}
        </HStack>
      )}
    </VStack>
  );
}
