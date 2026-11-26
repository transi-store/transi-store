import {
  Container,
  Heading,
  VStack,
  Button,
  Box,
  Text,
  HStack,
  Stack,
  SegmentGroup,
} from "@chakra-ui/react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { LuPlus, LuGitBranch } from "react-icons/lu";
import { ProjectBreadcrumb } from "~/components/navigation/ProjectBreadcrumb";
import { ProjectNav } from "~/components/navigation/ProjectNav";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.branches._index";
import {
  organizationContext,
  projectAccessRoleContext,
  projectContext,
} from "~/middleware/project-access.server";
import {
  getBranchesByProject,
  getBranchKeyCount,
  getBranchKeyDeletionCount,
} from "~/lib/branches.server";
import { createNewBranchUrl, getBranchesUrl } from "~/lib/routes-helpers";
import { BRANCH_STATUS } from "~/lib/branches";
import { BranchList } from "~/components/branches/BranchList";

export async function loader({ request, context }: Route.LoaderArgs) {
  const organization = context.get(organizationContext);
  const project = context.get(projectContext);
  const projectAccessRole = context.get(projectAccessRoleContext);

  const status =
    new URL(request.url).searchParams.get("status") === BRANCH_STATUS.MERGED
      ? BRANCH_STATUS.MERGED
      : BRANCH_STATUS.OPEN;

  const allBranches = await getBranchesByProject(project.id);
  const branches = allBranches.filter((branch) => branch.status === status);
  const statusCounts: Record<BRANCH_STATUS, number> = {
    [BRANCH_STATUS.OPEN]: allBranches.filter(
      (branch) => branch.status === BRANCH_STATUS.OPEN,
    ).length,
    [BRANCH_STATUS.MERGED]: allBranches.filter(
      (branch) => branch.status === BRANCH_STATUS.MERGED,
    ).length,
  };

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

  return {
    organization,
    project,
    branches: branchesWithCounts,
    status,
    statusCounts,
    projectAccessRole,
  };
}

export default function BranchesList({ loaderData }: Route.ComponentProps) {
  const {
    organization,
    project,
    branches,
    status,
    statusCounts,
    projectAccessRole,
  } = loaderData;
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();

  const statusItems = [
    { value: BRANCH_STATUS.OPEN, label: t("branches.status.open") },
    { value: BRANCH_STATUS.MERGED, label: t("branches.status.merged") },
  ].map(({ value, label }) => ({
    value,
    label: (
      <HStack gap={1.5} as="span">
        <span>{label}</span>
        <Text as="span" color="fg.muted" fontSize="xs">
          {statusCounts[value]}
        </Text>
      </HStack>
    ),
  }));

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
            projectAccessRole={projectAccessRole}
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

        <SegmentGroup.Root
          size="sm"
          alignSelf="flex-start"
          value={status}
          onValueChange={(e) =>
            setSearchParams(
              e.value === BRANCH_STATUS.MERGED ? { status: e.value } : {},
            )
          }
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items items={statusItems} />
        </SegmentGroup.Root>

        {branches.length === 0 ? (
          <Box p={8} textAlign="center" bg="bg.subtle" borderRadius="md">
            <Text color="fg.muted">
              {status === BRANCH_STATUS.MERGED
                ? t("branches.list.emptyMerged")
                : t("branches.list.empty")}
            </Text>
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
