import { Button, SimpleGrid, Card, Heading, Text } from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LuDownload } from "react-icons/lu";
import type { ProjectLanguage } from "../../../../drizzle/schema";

type ExportJsonSectionProps = {
  languages: Array<ProjectLanguage>;
  organizationSlug: string;
  projectSlug: string;
};

export function ExportJsonSection({
  languages,
  organizationSlug,
  projectSlug,
}: ExportJsonSectionProps) {
  const { t } = useTranslation();

  return (
    <Card.Root>
      <Card.Body>
        <Heading as="h3" size="md" mb={3}>
          {t("export.json.title")}
        </Heading>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          {t("export.json.description")}
        </Text>
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
          {languages.map((lang) => (
            <Button key={lang.id} asChild size="sm" variant="outline">
              <Link
                reloadDocument
                to={`/api/orgs/${organizationSlug}/projects/${projectSlug}/export?format=json&locale=${lang.locale}`}
              >
                <LuDownload />
                {lang.locale.toUpperCase()}
              </Link>
            </Button>
          ))}
          <Button asChild size="sm" colorPalette="brand">
            <Link
              reloadDocument
              to={`/api/orgs/${organizationSlug}/projects/${projectSlug}/export?format=json&all`}
            >
              <LuDownload />
              {t("export.allLanguages")}
            </Link>
          </Button>
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  );
}
