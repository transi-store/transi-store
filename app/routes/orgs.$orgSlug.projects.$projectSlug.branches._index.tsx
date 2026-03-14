import {
  Container,
  Heading,
  VStack,
  Button,
  Box,
  Text,
  HStack,
  Badge,
  Stack,
  Card,
} from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPlus, LuGitBranch } from "react-icons/lu";
import { ProjectBreadcrumb } from "~/components/ProjectBreadcrumb";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.branches._index";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import {
  getBranchesByProject,
  getBranchKeyCount,
} from "~/lib/branches.server";
import { getBranchUrl } from "~/lib/routes-helpers";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const branches = await getBranchesByProject(project.id);

  // Get key counts for each open branch
  const branchesWithCounts = await Promise.all(
    branches.map(async (branch) => ({
      ...branch,
      keyCount:
        branch.status === "open" ? await getBranchKeyCount(branch.id) : 0,
    })),
  );

  return { organization, project, branches: branchesWithCounts };
}

const STATUS_COLOR_MAP = {
  open: "green",
  merged: "purple",
  closed: "gray",
} as const;

export default function BranchesList({ loaderData }: Route.ComponentProps) {
  const { organization, project, branches } = loaderData;
  const { t } = useTranslation();

  return (
    <Container maxW="container.xl" py={5}>
      <VStack gap={6} align="stretch">
        <ProjectBreadcrumb
          organizationSlug={organization.slug}
          organizationName={organization.name}
          projectSlug={project.slug}
          projectName={project.name}
          items={[
            { label: t("branches.title"), to: `/orgs/${organization.slug}/projects/${project.slug}/branches` },
          ]}
        />

        <Stack
          direction={{ base: "column", sm: "row" }}
          justify="space-between"
          align={{ base: "stretch", sm: "center" }}
          gap={{ base: 3, sm: 0 }}
        >
          <Box>
            <Heading as="h2" size="lg">
              <HStack>
                <LuGitBranch />
                <span>{t("branches.title")}</span>
              </HStack>
            </Heading>
            <Text color="fg.muted" mt={2}>
              {t("branches.description")}
            </Text>
          </Box>
          <Button
            asChild
            colorPalette="accent"
            width={{ base: "full", sm: "auto" }}
          >
            <Link
              to={`/orgs/${organization.slug}/projects/${project.slug}/branches/new`}
            >
              <LuPlus /> {t("branches.create")}
            </Link>
          </Button>
        </Stack>

        {branches.length === 0 ? (
          <Box p={8} textAlign="center" bg="bg.subtle" borderRadius="md">
            <Text color="fg.muted">{t("branches.list.empty")}</Text>
          </Box>
        ) : (
          <VStack gap={3} align="stretch">
            {branches.map((branch) => (
              <Card.Root key={branch.id} size="sm">
                <Card.Body>
                  <HStack justify="space-between" align="center">
                    <VStack align="start" gap={1}>
                      <HStack>
                        <LuGitBranch />
                        {branch.status === "open" ? (
                          <Link
                            to={getBranchUrl(
                              organization.slug,
                              project.slug,
                              branch.slug,
                            )}
                          >
                            <Text fontWeight="semibold">{branch.name}</Text>
                          </Link>
                        ) : (
                          <Text fontWeight="semibold" color="fg.muted">
                            {branch.name}
                          </Text>
                        )}
                        <Badge
                          colorPalette={STATUS_COLOR_MAP[branch.status]}
                          size="sm"
                        >
                          {t(`branches.status.${branch.status}`)}
                        </Badge>
                      </HStack>
                      {branch.description && (
                        <Text color="fg.muted" fontSize="sm">
                          {branch.description}
                        </Text>
                      )}
                    </VStack>
                    <HStack gap={3}>
                      {branch.status === "open" && (
                        <>
                          <Badge variant="outline" size="sm">
                            {t("branches.keysBadge", {
                              count: branch.keyCount,
                            })}
                          </Badge>
                          <Button asChild size="sm" variant="outline">
                            <Link
                              to={getBranchUrl(
                                organization.slug,
                                project.slug,
                                branch.slug,
                              )}
                            >
                              {t("translations.edit")}
                            </Link>
                          </Button>
                        </>
                      )}
                    </HStack>
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        )}
      </VStack>
    </Container>
  );
}
