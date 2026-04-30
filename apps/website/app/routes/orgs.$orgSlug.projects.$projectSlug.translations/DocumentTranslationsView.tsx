import { Heading, Button, Box, Text, Stack, Code } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { SupportedFormat } from "@transi-store/common";
import { MarkdownTranslateLayout } from "~/components/markdown-translate/MarkdownTranslateLayout";
import type { DocumentTranslationsLoaderData } from "./loadDocumentTranslations.server";
import type { ProjectFile } from "../../../drizzle/schema";

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: { id: string; slug: string; name: string };
};

type Props = {
  data: DocumentTranslationsLoaderData;
  context: ContextType;
  selectedFile: ProjectFile;
};

export function DocumentTranslationsView({
  data,
  context,
  selectedFile,
}: Props) {
  const { t } = useTranslation();
  const { markdownData } = data;
  const { organization, project } = context;

  const initialLeftLocale = useMemo(() => {
    const def = markdownData.languages.find((l) => l.isDefault);
    return def?.locale ?? markdownData.languages[0]?.locale ?? "";
  }, [markdownData]);

  const initialRightLocale = useMemo(() => {
    const others = markdownData.languages.filter(
      (l) => l.locale !== initialLeftLocale,
    );
    return others[0]?.locale ?? initialLeftLocale;
  }, [markdownData, initialLeftLocale]);

  const isMdx = selectedFile.format === SupportedFormat.MDX;

  return (
    <Stack gap={4} h="full" w="full">
      <Stack gap={1}>
        <Heading as="h2" size="md">
          <Code fontSize="md">{selectedFile.filePath}</Code>
        </Heading>
        <Text fontSize="sm" color="fg.muted">
          {t("markdownTranslate.subtitle", { format: selectedFile.format })}
        </Text>
      </Stack>

      {markdownData.tooFewLanguages ? (
        <Box p={8} bg="bg.subtle" borderRadius="md" textAlign="center">
          <Text color="fg.muted" mb={3}>
            {t("markdownTranslate.errors.tooFewLanguages")}
          </Text>
          <Button asChild colorPalette="brand">
            <Link
              to={`/orgs/${organization.slug}/projects/${project.slug}/settings`}
            >
              {t("translations.manageLanguages")}
            </Link>
          </Button>
        </Box>
      ) : (
        <MarkdownTranslateLayout
          organizationSlug={organization.slug}
          projectSlug={project.slug}
          fileId={selectedFile.id}
          filePath={selectedFile.filePath}
          isMdx={isMdx}
          languages={markdownData.languages.map((l) => ({
            locale: l.locale,
            isDefault: l.isDefault ?? false,
          }))}
          initialContent={markdownData.contentByLocale}
          fuzzyByLocale={markdownData.fuzzyByLocale}
          initialLeftLocale={initialLeftLocale}
          initialRightLocale={initialRightLocale}
        />
      )}
    </Stack>
  );
}
