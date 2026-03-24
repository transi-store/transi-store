import { Box, Text, Heading, Card } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { ImportForm } from "./ImportForm";
import { ImportResults } from "./ImportResults";
import type { ProjectLanguage } from "../../../../drizzle/schema";
import type { ImportActionData } from "..";

type ImportSectionProps = {
  languages: Array<ProjectLanguage>;
  isSubmitting: boolean;
  actionData?: ImportActionData;
};

export default function ImportSection({
  languages,
  isSubmitting,
  actionData,
}: ImportSectionProps) {
  const { t } = useTranslation();

  const importStats = actionData?.success ? actionData.importStats : undefined;
  const error = actionData?.success === false ? actionData.error : undefined;
  const details =
    actionData?.success === false ? actionData.details : undefined;

  return (
    <Box>
      <Heading as="h2" size="lg" mb={4}>
        {t("import.title")}
      </Heading>

      {languages.length === 0 ? (
        <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="fg.muted" mb={4}>
            {t("import.noLanguages")}
          </Text>
        </Box>
      ) : (
        <Card.Root>
          <Card.Body>
            <ImportForm
              key={
                actionData?.success ? actionData?.actionTimestamp : undefined
              }
              languages={languages}
              isSubmitting={isSubmitting}
            />
          </Card.Body>
        </Card.Root>
      )}

      <ImportResults
        importStats={importStats}
        error={error}
        details={details}
      />
    </Box>
  );
}
