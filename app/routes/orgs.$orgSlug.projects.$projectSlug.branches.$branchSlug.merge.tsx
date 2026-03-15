import {
  Container,
  Heading,
  VStack,
  Button,
  Box,
  Text,
  HStack,
  Badge,
  Card,
  List,
} from "@chakra-ui/react";
import {
  Link,
  useActionData,
  useNavigation,
  redirect,
  Form,
} from "react-router";
import { useTranslation } from "react-i18next";
import { LuGitMerge, LuGitBranch, LuArrowLeft } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.merge";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import {
  getBranchBySlug,
  getBranchKeys,
  mergeBranch,
} from "~/lib/branches.server";
import { getBranchesUrl, getBranchUrl } from "~/lib/routes-helpers";
import { BRANCH_STATUS } from "~/lib/branches";

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

  const branch = await getBranchBySlug(project.id, params.branchSlug);
  if (!branch) {
    throw new Response("Branch not found", { status: 404 });
  }

  if (branch.status !== BRANCH_STATUS.OPEN) {
    throw redirect(getBranchesUrl(params.orgSlug, params.projectSlug));
  }

  // Get keys that would be merged
  const branchKeys = await getBranchKeys(branch.id);

  return { organization, project, branch, branchKeys };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);
  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const branch = await getBranchBySlug(project.id, params.branchSlug);
  if (!branch) {
    throw new Response("Branch not found", { status: 404 });
  }

  const result = await mergeBranch(branch.id, user.userId);

  if (!result.success) {
    return { error: result.error, conflictingKeys: result.conflictingKeys };
  }

  return redirect(getBranchesUrl(params.orgSlug, params.projectSlug));
}

export default function MergeBranch({ loaderData }: Route.ComponentProps) {
  const { organization, project, branch, branchKeys } = loaderData;
  const { t } = useTranslation();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Container maxW="container.md" py={10}>
      <VStack gap={6} align="stretch">
        <Button asChild variant="ghost" size="sm" alignSelf="flex-start">
          <Link to={getBranchUrl(organization.slug, project.slug, branch.slug)}>
            <LuArrowLeft /> {t("project.back")}
          </Link>
        </Button>

        <HStack>
          <LuGitMerge />
          <Heading as="h1" size="xl">
            {t("branches.merge")}
          </Heading>
        </HStack>

        <Card.Root>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <HStack>
                <LuGitBranch />
                <Text fontWeight="semibold">{branch.name}</Text>
                <Badge colorPalette="green" size="sm">
                  {t("branches.status.open")}
                </Badge>
              </HStack>

              {actionData?.error && (
                <Box p={4} bg="red.subtle" color="red.fg" borderRadius="md">
                  <Text fontWeight="semibold">{actionData.error}</Text>
                  {actionData.conflictingKeys && (
                    <List.Root mt={2}>
                      {actionData.conflictingKeys.map((key: string) => (
                        <List.Item key={key}>{key}</List.Item>
                      ))}
                    </List.Root>
                  )}
                </Box>
              )}

              {branchKeys.length === 0 ? (
                <Box p={4} bg="bg.subtle" borderRadius="md">
                  <Text color="fg.muted">{t("branches.merge.empty")}</Text>
                </Box>
              ) : (
                <>
                  <Text>{t("branches.merge.preview")}</Text>
                  <Box
                    borderWidth={1}
                    borderRadius="md"
                    p={3}
                    maxH="300px"
                    overflowY="auto"
                  >
                    <VStack align="stretch" gap={1}>
                      {branchKeys.map((key) => (
                        <HStack key={key.id}>
                          <Badge size="sm" variant="outline">
                            {key.keyName}
                          </Badge>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>

                  <Text color="fg.muted" fontSize="sm">
                    {t("branches.merge.confirm")}
                  </Text>

                  <Form method="post">
                    <Button
                      type="submit"
                      colorPalette="purple"
                      loading={isSubmitting}
                      width="full"
                    >
                      <LuGitMerge /> {t("branches.merge")} ({branchKeys.length}{" "}
                      {t("branches.keysBadge", {
                        count: branchKeys.length,
                      })}
                      )
                    </Button>
                  </Form>
                </>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  );
}
