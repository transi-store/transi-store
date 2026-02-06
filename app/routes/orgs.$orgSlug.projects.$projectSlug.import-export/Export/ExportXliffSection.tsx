import { Button, HStack, Card, Heading, Text } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LuDownload } from "react-icons/lu";
import type { ProjectLanguage } from "../../../../drizzle/schema";

type ExportXliffSectionProps = {
  languages: Array<ProjectLanguage>;
  organizationSlug: string;
  projectSlug: string;
};

export function ExportXliffSection({
  languages,
  organizationSlug,
  projectSlug,
}: ExportXliffSectionProps) {
  const { t } = useTranslation();

  // XLIFF requires at least 2 languages
  if (languages.length < 2) {
    return null;
  }

  return (
    <Card.Root>
      <Card.Body>
        <Heading as="h3" size="md" mb={3}>
          {t("export.xliff.title")}
        </Heading>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          {t("export.xliff.description")}
        </Text>
        <Text fontSize="xs" color="fg.subtle" mb={3}>
          {t("export.xliff.example", {
            org: organizationSlug,
            project: projectSlug,
          })}
        </Text>
        <HStack>
          <Button asChild size="sm" variant="outline">
            <Link
              reloadDocument
              to={`/api/orgs/${organizationSlug}/projects/${projectSlug}/export?format=xliff&source=${languages[0].locale}&target=${languages[1].locale}`}
            >
              <LuDownload />
              {languages[0].locale.toUpperCase()} →{" "}
              {languages[1].locale.toUpperCase()}
            </Link>
          </Button>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
