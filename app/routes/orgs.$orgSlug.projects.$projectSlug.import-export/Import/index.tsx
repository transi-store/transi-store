import { Box, Text, Heading, Card } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useRef, useState, useEffect } from "react";
import { ImportForm } from "./ImportForm";
import { ImportResults } from "./ImportResults";
import type { ProjectLanguage } from "../../../../drizzle/schema";
import type { ImportStats } from "~/lib/import/json.server";

type ImportSectionProps = {
  languages: Array<ProjectLanguage>;
  isSubmitting: boolean;
  actionSuccess?: boolean;
  importStats?: ImportStats;
  error?: string;
  details?: string;
};

export default function ImportSection({
  languages,
  isSubmitting,
  actionSuccess,
  importStats,
  error,
  details,
}: ImportSectionProps) {
  const { t } = useTranslation();
  const importFormRef = useRef<HTMLFormElement>(null);
  const [shouldOverwrite, setShouldOverwrite] = useState(false);

  // Reset form after successful import
  useEffect(() => {
    if (actionSuccess && importFormRef.current) {
      importFormRef.current.reset();
      setShouldOverwrite(false);
    }
  }, [actionSuccess]);

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
              languages={languages}
              isSubmitting={isSubmitting}
              formRef={importFormRef}
              shouldOverwrite={shouldOverwrite}
              onOverwriteChange={setShouldOverwrite}
            />
          </Card.Body>
        </Card.Root>
      )}

      <ImportResults
        importStats={actionSuccess ? importStats : undefined}
        error={error}
        details={details}
      />
    </Box>
  );
}
