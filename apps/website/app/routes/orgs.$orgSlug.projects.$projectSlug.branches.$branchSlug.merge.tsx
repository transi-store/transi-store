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
  Code,
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
import { userContext } from "~/middleware/auth.server";
import {
  organizationContext,
  projectContext,
} from "~/middleware/project-access.server";
import {
  getBranchBySlug,
  getBranchKeys,
  getBranchKeyDeletions,
  mergeBranch,
} from "~/lib/branches.server";
import { getBranchesUrl, getBranchUrl } from "~/lib/routes-helpers";
import { BRANCH_STATUS } from "~/lib/branches";

export async function loader({ params, context }: Route.LoaderArgs) {
  const organization = context.get(organizationContext);
  const project = context.get(projectContext);

  const branch = await getBranchBySlug(project.id, params.branchSlug);
  if (!branch) {
    throw new Response("Branch not found", { status: 404 });
  }

  if (branch.status !== BRANCH_STATUS.OPEN) {
    throw redirect(getBranchesUrl(params.orgSlug, params.projectSlug));
  }

  // Get keys that would be merged
  const branchKeys = await getBranchKeys(branch.id);

  // Get keys that would be deleted
  const keyDeletions = await getBranchKeyDeletions(branch.id);

  return { organization, project, branch, branchKeys, keyDeletions };
}

export async function action({ params, context }: Route.ActionArgs) {
  const user = context.get(userContext);
  const project = context.get(projectContext);

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
  const { organization, project, branch, branchKeys, keyDeletions } =
    loaderData;
  const { t } = useTranslation();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const hasChanges = branchKeys.length > 0 || keyDeletions.length > 0;

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

              {!hasChanges ? (
                <Box p={4} bg="bg.subtle" borderRadius="md">
                  <Text color="fg.muted">{t("branches.merge.empty")}</Text>
                </Box>
              ) : (
                <>
                  {/* Additions section */}
                  {branchKeys.length > 0 && (
                    <Box>
                      <Text fontWeight="semibold" mb={2}>
                        {t("branches.merge.preview")}
                      </Text>
                      <Box
                        borderWidth={1}
                        borderRadius="md"
                        p={3}
                        maxH="200px"
                        overflowY="auto"
                      >
                        <VStack align="stretch" gap={1}>
                          {branchKeys.map((key) => (
                            <HStack key={key.id}>
                              <Badge size="sm" variant="outline">
                                {key.keyName}
                              </Badge>
                              <Code fontSize="xs">{key.filePath}</Code>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    </Box>
                  )}

                  {/* Deletions section */}
                  {keyDeletions.length > 0 && (
                    <Box>
                      <Text fontWeight="semibold" mb={2}>
                        {t("branches.merge.deletions.preview")}
                      </Text>
                      <Box
                        borderWidth={1}
                        borderColor="red.muted"
                        borderRadius="md"
                        p={3}
                        maxH="200px"
                        overflowY="auto"
                        bg="red.subtle"
                      >
                        <VStack align="stretch" gap={1}>
                          {keyDeletions.map((key) => (
                            <HStack key={key.id}>
                              <Badge
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                              >
                                {key.keyName}
                              </Badge>
                              <Code fontSize="xs">{key.filePath}</Code>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    </Box>
                  )}

                  {/* Summary */}
                  <Text color="fg.muted" fontSize="sm">
                    {t("branches.merge.summary", {
                      added: branchKeys.length,
                      deleted: keyDeletions.length,
                    })}
                  </Text>

                  <Form method="post">
                    <Button
                      type="submit"
                      colorPalette="purple"
                      loading={isSubmitting}
                      width="full"
                    >
                      <LuGitMerge /> {t("branches.merge")}
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
