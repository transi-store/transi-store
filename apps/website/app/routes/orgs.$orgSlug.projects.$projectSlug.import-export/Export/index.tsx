import {
  Box,
  Text,
  Heading,
  VStack,
  Separator,
  Button,
  SimpleGrid,
  Field,
  Select,
  Portal,
  createListCollection,
  Badge,
} from "@chakra-ui/react";
import { Link } from "react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LuDownload } from "react-icons/lu";
import type { ProjectFile, ProjectLanguage } from "../../../../drizzle/schema";
import { SupportedFormat, FORMAT_LABELS } from "@transi-store/common";

const formatCollection = createListCollection({
  items: Object.values(SupportedFormat).map((value) => ({
    label: FORMAT_LABELS[value],
    value,
  })),
});

type ExportSectionProps = {
  languages: Array<ProjectLanguage>;
  projectFiles: Array<ProjectFile>;
  organizationSlug: string;
  projectSlug: string;
};

export default function ExportSection({
  languages,
  projectFiles,
  organizationSlug,
  projectSlug,
}: ExportSectionProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<string[]>([SupportedFormat.JSON]);

  if (languages.length === 0) {
    return null;
  }

  const selectedFormat = format[0] ?? SupportedFormat.JSON;
  const baseUrl = `/api/orgs/${organizationSlug}/projects/${projectSlug}/translations`;

  return (
    <>
      <Separator />
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          {t("export.title")}
        </Heading>
        <Text color="fg.muted" mb={4}>
          {t("export.description")}
        </Text>

        <VStack gap={6} align="stretch">
          {/* Format selector (used when no files, or for whole-project export) */}
          {projectFiles.length === 0 && (
            <Field.Root>
              <Field.Label>{t("export.formatLabel")}</Field.Label>
              <Select.Root
                collection={formatCollection}
                value={format}
                onValueChange={(details) => setFormat(details.value)}
                maxW="300px"
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {formatCollection.items.map((item) => (
                        <Select.Item item={item} key={item.value}>
                          {item.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Field.Root>
          )}

          {/* Per-file export */}
          {projectFiles.length > 0 ? (
            <VStack align="stretch" gap={4}>
              {projectFiles.map((file) => (
                <Box key={file.id}>
                  <Box mb={2}>
                    <Badge colorPalette="gray" mr={2}>
                      {FORMAT_LABELS[file.format as SupportedFormat] ??
                        file.format}
                    </Badge>
                    <Text as="span" fontWeight="medium">
                      {file.name}
                    </Text>
                    <Text as="span" fontSize="sm" color="fg.muted" ml={2}>
                      ({file.filePath})
                    </Text>
                  </Box>
                  <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
                    {languages.map((lang) => (
                      <Button key={lang.id} asChild size="sm" variant="outline">
                        <Link
                          reloadDocument
                          to={`${baseUrl}?format=${file.format}&locale=${lang.locale}&fileId=${file.id}`}
                        >
                          <LuDownload />
                          {lang.locale.toUpperCase()}
                        </Link>
                      </Button>
                    ))}
                  </SimpleGrid>
                </Box>
              ))}
            </VStack>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
              {languages.map((lang) => (
                <Button key={lang.id} asChild size="sm" variant="outline">
                  <Link
                    reloadDocument
                    to={`${baseUrl}?format=${selectedFormat}&locale=${lang.locale}`}
                  >
                    <LuDownload />
                    {lang.locale.toUpperCase()}
                  </Link>
                </Button>
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </Box>
    </>
  );
}
