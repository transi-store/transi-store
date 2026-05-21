/**
 * Read-only side-by-side viewer for a markdown / MDX document body. Used in
 * the branch UI where document editing is not supported: the content shown
 * comes from main and cannot be changed from the branch view.
 */
import { useMemo, useState } from "react";
import { Alert, Badge, Box, Code, Flex, HStack, Stack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { MarkdownEditorClient } from "~/components/markdown-editor";
import { LanguagePicker } from "./LanguagePicker";

type Language = {
  locale: string;
  isDefault: boolean;
};

type Props = {
  filePath: string;
  isMdx: boolean;
  languages: ReadonlyArray<Language>;
  contentByLocale: Record<string, string>;
};

export function MarkdownTranslateReadOnly({
  filePath,
  isMdx,
  languages,
  contentByLocale,
}: Props) {
  const { t } = useTranslation();

  const defaultLocale = useMemo(() => {
    return (
      languages.find((l) => l.isDefault)?.locale ?? languages[0]?.locale ?? ""
    );
  }, [languages]);
  const otherLocale = useMemo(() => {
    const others = languages.filter((l) => l.locale !== defaultLocale);
    return others[0]?.locale ?? defaultLocale;
  }, [languages, defaultLocale]);

  const [leftLocale, setLeftLocale] = useState(defaultLocale);
  const [rightLocale, setRightLocale] = useState(otherLocale);

  const leftContent = contentByLocale[leftLocale] ?? "";
  const rightContent = contentByLocale[rightLocale] ?? "";

  return (
    <Stack gap={3} h="full" w="full">
      <Alert.Root status="info" size="sm">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t("branches.documents.readOnly.title")}</Alert.Title>
          <Alert.Description>
            {t("branches.documents.readOnly.description")}{" "}
            <Code fontSize="xs">{filePath}</Code>
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>

      <Flex
        gap={2}
        align="stretch"
        h={{ base: "calc(100vh - 280px)", md: "calc(100vh - 260px)" }}
        minH="400px"
      >
        <ReadOnlyPane
          locale={leftLocale}
          otherLocale={rightLocale}
          content={leftContent}
          languages={languages}
          isMdx={isMdx}
          onLocaleChange={setLeftLocale}
        />
        <ReadOnlyPane
          locale={rightLocale}
          otherLocale={leftLocale}
          content={rightContent}
          languages={languages}
          isMdx={isMdx}
          onLocaleChange={setRightLocale}
        />
      </Flex>
    </Stack>
  );
}

type ReadOnlyPaneProps = {
  locale: string;
  otherLocale: string;
  content: string;
  languages: ReadonlyArray<Language>;
  isMdx: boolean;
  onLocaleChange: (locale: string) => void;
};

function ReadOnlyPane({
  locale,
  otherLocale,
  content,
  languages,
  isMdx,
  onLocaleChange,
}: ReadOnlyPaneProps) {
  const { t } = useTranslation();
  return (
    <Flex direction="column" flex="1" minW={0} gap={2}>
      <HStack justify="space-between" gap={2} wrap="wrap">
        <LanguagePicker
          value={locale}
          onChange={onLocaleChange}
          languages={languages}
          disabledLocale={otherLocale}
        />
        <Badge size="xs" variant="subtle">
          {t("branches.documents.readOnly.badge")}
        </Badge>
      </HStack>
      <Box flex="1" minH={0} display="flex">
        <MarkdownEditorClient
          key={locale}
          value={content}
          onChange={() => {}}
          disabled
          mdx={isMdx}
        />
      </Box>
    </Flex>
  );
}
