import {
  Container,
  Heading,
  VStack,
  Button,
  Box,
  Text,
  HStack,
  Stack,
} from "@chakra-ui/react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPlus, LuGitBranch } from "react-icons/lu";
import { ProjectBreadcrumb } from "~/components/navigation/ProjectBreadcrumb";
import { ProjectNav } from "~/components/navigation/ProjectNav";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.branches._index";
import { maybeUserContext, requireUserFromContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import {
  getBranchesByProject,
  getBranchKeyCount,
  getBranchKeyDeletionCount,
} from "~/lib/branches.server";
import { createNewBranchUrl, getBranchesUrl } from "~/lib/routes-helpers";
import { BRANCH_STATUS } from "~/lib/branches";
import { createProjectNotFoundResponse } from "~/errors/response-errors/ProjectNotFoundResponse";
import { BranchList } from "~/components/branches/BranchList";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const maybeUser = context.get(maybeUserContext);
  const user = requireUserFromContext(maybeUser, request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw createProjectNotFoundResponse(params.projectSlug);
  }

  const branches = await getBranchesByProject(project.id);

  // Get key counts for each open branch
  const branchesWithCounts = await Promise.all(
    branches.map(async (branch) => ({
      ...branch,
      keyCount:
        branch.status === BRANCH_STATUS.OPEN
          ? await getBranchKeyCount(branch.id)
          : 0,
      deletionCount:
        branch.status === BRANCH_STATUS.OPEN
          ? await getBranchKeyDeletionCount(branch.id)
          : 0,
    })),
  );

  return { organization, project, branches: branchesWithCounts };
}

export default function BranchesList({ loaderData }: Route.ComponentProps) {
  const { organization, project, branches } = loaderData;
  const { t } = useTranslation();

  return (
    <Container maxW="container.xl" py={5}>
      <VStack gap={6} align="stretch">
        <Stack
          direction={{ base: "column", md: "row" }}
          gap={2}
          borderBottomWidth={1}
          pb={2}
          align={{ base: "stretch", md: "center" }}
        >
          <Box flex={{ base: "1", md: "auto" }} overflow="hidden">
            <ProjectBreadcrumb
              organizationSlug={organization.slug}
              organizationName={organization.name}
              projectSlug={project.slug}
              projectName={project.name}
              items={[
                {
                  label: t("branches.title"),
                  to: getBranchesUrl(organization.slug, project.slug),
                },
              ]}
            />
          </Box>

          <ProjectNav
            organizationSlug={organization.slug}
            projectSlug={project.slug}
          />
        </Stack>

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
            <Link to={createNewBranchUrl(organization.slug, project.slug)}>
              <LuPlus /> {t("branches.create")}
            </Link>
          </Button>
        </Stack>

        {branches.length === 0 ? (
          <Box p={8} textAlign="center" bg="bg.subtle" borderRadius="md">
            <Text color="fg.muted">{t("branches.list.empty")}</Text>
          </Box>
        ) : (
          <BranchList
            branches={branches}
            organizationSlug={organization.slug}
            projectSlug={project.slug}
          />
        )}
      </VStack>
    </Container>
  );
}
