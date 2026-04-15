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
} from "@chakra-ui/react";
import { Link } from "react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LuDownload } from "react-icons/lu";
import type { ProjectLanguage } from "../../../../drizzle/schema";
import { SupportedFormat, FORMAT_LABELS } from "@transi-store/common";

const formatCollection = createListCollection({
  items: Object.values(SupportedFormat).map((value) => ({
    label: FORMAT_LABELS[value],
    value,
  })),
});

type ExportSectionProps = {
  languages: Array<ProjectLanguage>;
  organizationSlug: string;
  projectSlug: string;
};

export default function ExportSection({
  languages,
  organizationSlug,
  projectSlug,
}: ExportSectionProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<string[]>([SupportedFormat.JSON]);

  if (languages.length === 0) {
    return null;
  }

  const selectedFormat = format[0] ?? SupportedFormat.JSON;

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

        <VStack gap={4} align="stretch">
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

          <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
            {languages.map((lang) => (
              <Button key={lang.id} asChild size="sm" variant="outline">
                <Link
                  reloadDocument
                  to={`/api/orgs/${organizationSlug}/projects/${projectSlug}/translations?format=${selectedFormat}&locale=${lang.locale}`}
                >
                  <LuDownload />
                  {lang.locale.toUpperCase()}
                </Link>
              </Button>
            ))}
          </SimpleGrid>
        </VStack>
      </Box>
    </>
  );
}
