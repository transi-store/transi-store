import { Box, Text, Heading, VStack, Separator } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { ExportJsonSection } from "./ExportJsonSection";
import { ExportXliffSection } from "./ExportXliffSection";
import type { ProjectLanguage } from "../../../../drizzle/schema";

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

  if (languages.length === 0) {
    return null;
  }

  return (
    <>
      <Separator />
      <Box>
        <Heading as="h2" size="lg" mb={4}>
          {t("export.title")}
        </Heading>
        <Text color="gray.600" mb={4}>
          {t("export.description")}
        </Text>

        <VStack gap={4} align="stretch">
          <ExportJsonSection
            languages={languages}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
          <ExportXliffSection
            languages={languages}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        </VStack>
      </Box>
    </>
  );
}
