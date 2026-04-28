import {
  Heading,
  Button,
  Box,
  Text,
  SimpleGrid,
  HStack,
} from "@chakra-ui/react";
import { Link, useLoaderData } from "react-router";
import { LuPlus } from "react-icons/lu";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { useTranslation } from "react-i18next";
import { getProjectUrl } from "~/lib/routes-helpers";
import ProjectCard, { type ProjectWithStats } from "./ProjectCard";
import {
  getProjectsForOrganization,
  getProjectLanguagesForProjects,
  getTranslationCoverageForProjects,
} from "~/lib/projects.server";
import type { Route } from "./+types";

export async function loader({ params, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const rawProjects = await getProjectsForOrganization(organization.id);

  const [allLocales, coverageData] = await Promise.all(
    rawProjects.length > 0
      ? [
          getProjectLanguagesForProjects(rawProjects),
          getTranslationCoverageForProjects(rawProjects),
        ]
      : [Promise.resolve([]), Promise.resolve([])],
  );

  const projects: Array<ProjectWithStats> = rawProjects.map((project) => {
    const locales = allLocales
      .filter((l) => l.projectId === project.id)
      .map((l) => ({ locale: l.locale, isDefault: l.isDefault ?? false }));

    const nonDefaultLocaleCount = locales.filter((l) => !l.isDefault).length;
    const translatedCount =
      coverageData.find((c) => c.projectId === project.id)?.translatedCount ??
      0;
    const totalPossible = project.translationKeyCount * nonDefaultLocaleCount;
    const coverage = totalPossible > 0 ? translatedCount / totalPossible : 1;

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      updatedAt: project.updatedAt.toISOString(),
      translationKeyCount: project.translationKeyCount,
      locales,
      coverage,
    };
  });

  return { organization, projects };
}

export default function OrganizationProjects() {
  const { t } = useTranslation();
  const { organization, projects } = useLoaderData<typeof loader>();

  return (
    <Box pt={6}>
      <HStack justify="space-between" mb={4}>
        <Heading as="h2" size="lg">
          {t("orgs.projects")}
        </Heading>
        <Button asChild colorPalette="brand" size="sm">
          <Link to={`/orgs/${organization.slug}/projects/new`}>
            <LuPlus /> {t("projects.new.title")}
          </Link>
        </Button>
      </HStack>

      {projects.length === 0 ? (
        <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="fg.muted" mb={4}>
            {t("orgs.noProjects")}
          </Text>
          <Button asChild colorPalette="brand">
            <Link to={`/orgs/${organization.slug}/projects/new`}>
              <LuPlus /> {t("projects.new.firstProject")}
            </Link>
          </Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              href={getProjectUrl(organization.slug, project.slug)}
            />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
