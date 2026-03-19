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
} from "@chakra-ui/react";
import {
  Link,
  useActionData,
  useNavigation,
  redirect,
  Form,
} from "react-router";
import { ProjectBreadcrumb } from "~/components/navigation/ProjectBreadcrumb";
import { useTranslation } from "react-i18next";
import { LuGitBranch, LuPlus, LuGitMerge, LuTrash2 } from "react-icons/lu";
import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug";
import { userContext } from "~/middleware/auth";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import { getBranchBySlug, deleteBranch } from "~/lib/branches.server";
import {
  getTranslationKeys,
  createTranslationKey,
  getTranslationKeyByName,
} from "~/lib/translation-keys.server";
import { TranslationKeyDrawer } from "~/components/translation-key";
import {
  TranslationKeyModal,
  TRANSLATIONS_KEY_MODEL_MODE,
} from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationKeyModal";
import { TranslationsTable } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsTable";
import { TranslationsPagination } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsPagination";
import { TranslationsSearchBar } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/TranslationsSearchBar";
import { resolveSort } from "~/routes/orgs.$orgSlug.projects.$projectSlug.translations/index";
import { getInstance } from "~/middleware/i18next";
import {
  getBranchesUrl,
  getBranchMergeUrl,
  getBranchUrl,
} from "~/lib/routes-helpers";
import { BRANCH_STATUS } from "~/lib/branches";

const LIMIT = 50;

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
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

  const languages = await getProjectLanguages(project.id);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const highlight = url.searchParams.get("highlight") || undefined;
  const sort = resolveSort(url.searchParams.get("sort"), Boolean(search));
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const offset = (page - 1) * LIMIT;

  const keys = await getTranslationKeys(project.id, {
    search,
    limit: LIMIT,
    offset,
    sort,
    branchId: branch.id,
    branchOnly: true,
  });

  return {
    organization,
    project,
    branch,
    languages,
    keys,
    search,
    highlight,
    page,
    sort,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
  const user = context.get(userContext);
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

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "createKey") {
    const keyName = formData.get("keyName");
    const description = formData.get("description");

    if (!keyName || typeof keyName !== "string") {
      return {
        error: i18next.t("keys.new.errors.nameRequired"),
        action: "createKey",
      };
    }

    const existing = await getTranslationKeyByName(project.id, keyName);
    if (existing) {
      return {
        error: i18next.t("keys.new.errors.alreadyExists", { keyName }),
        action: "createKey",
      };
    }

    await createTranslationKey({
      projectId: project.id,
      keyName,
      description:
        description && typeof description === "string"
          ? description
          : undefined,
      branchId: branch.id,
    });

    return { success: true, keyName, search: keyName, action: "createKey" };
  }

  if (action === "closeBranch") {
    await deleteBranch(branch.id);
    return redirect(getBranchesUrl(params.orgSlug, params.projectSlug));
  }

  throw new Response(i18next.t("keys.errors.unknownAction"), { status: 400 });
}

export default function BranchDetail({ loaderData }: Route.ComponentProps) {
  const {
    organization,
    project,
    branch,
    languages,
    keys: { data, count },
    search,
    page,
    sort,
  } = loaderData;
  const { t } = useTranslation();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [drawerKeyId, setDrawerKeyId] = useState<number | null>(null);

  const handleEditInDrawer = useCallback((keyId: number) => {
    setDrawerKeyId(keyId);
  }, []);

  const handleDrawerClosed = useCallback(() => {
    setDrawerKeyId(null);
  }, []);

  const totalLanguages = languages.length;

  const currentUrl = getBranchUrl(organization.slug, project.slug, branch.slug);

  useEffect(() => {
    if (
      actionData?.success &&
      actionData.action === "createKey" &&
      navigation.state === "idle"
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCreateKeyModalOpen(false);
    }
  }, [actionData, navigation.state]);

  return (
    <Container maxW="container.xl" py={5}>
      <VStack gap={6} align="stretch">
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
            { label: branch.name, to: currentUrl },
          ]}
        />

        {/* Branch header */}
        <Stack
          direction={{ base: "column", sm: "row" }}
          justify="space-between"
          align={{ base: "stretch", sm: "center" }}
          gap={{ base: 3, sm: 0 }}
        >
          <Box>
            <HStack>
              <LuGitBranch />
              <Heading as="h2" size="lg">
                {branch.name}
              </Heading>
              <Badge colorPalette="green" size="sm">
                {t("branches.status.open")}
              </Badge>
            </HStack>
            {branch.description && (
              <Text color="fg.muted" mt={1}>
                {branch.description}
              </Text>
            )}
            <Text color="fg.muted" mt={1} fontSize="sm">
              {t("translations.count", { count })}
            </Text>
          </Box>
          <HStack gap={2} flexWrap="wrap">
            {languages.length > 0 && (
              <Button
                colorPalette="accent"
                onClick={() => setIsCreateKeyModalOpen(true)}
                size="sm"
              >
                <LuPlus /> {t("translations.newKey")}
              </Button>
            )}
            <Button asChild size="sm" colorPalette="purple" variant="outline">
              <Link
                to={getBranchMergeUrl(
                  organization.slug,
                  project.slug,
                  branch.slug,
                )}
              >
                <LuGitMerge /> {t("branches.merge")}
              </Link>
            </Button>
            <Form method="post">
              <input type="hidden" name="_action" value="closeBranch" />
              <Button
                type="submit"
                size="sm"
                colorPalette="red"
                variant="outline"
                loading={isSubmitting}
                onClick={(e) => {
                  if (!confirm(t("branches.close.confirm"))) {
                    e.preventDefault();
                  }
                }}
              >
                <LuTrash2 /> {t("branches.close")}
              </Button>
            </Form>
          </HStack>
        </Stack>

        <TranslationsSearchBar
          search={search}
          sort={sort}
          organizationSlug={organization.slug}
          projectSlug={project.slug}
          branchSlug={branch.slug}
        />

        {languages.length === 0 ? (
          <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
            <Text color="fg.muted" mb={4}>
              {t("translations.noLanguages")}
            </Text>
          </Box>
        ) : data.length === 0 ? (
          <Box p={8} textAlign="center" bg="bg.subtle" borderRadius="md">
            <Text color="fg.muted">
              {search
                ? t("translations.noResultsForSearch")
                : t("translations.noKeysEmpty")}
            </Text>
          </Box>
        ) : (
          <>
            <TranslationsTable
              data={data}
              search={search}
              totalLanguages={totalLanguages}
              organizationSlug={organization.slug}
              projectSlug={project.slug}
              currentUrl={currentUrl}
              onEditInDrawer={handleEditInDrawer}
            />

            <TranslationsPagination
              count={count}
              pageSize={LIMIT}
              currentPage={page}
              search={search}
              sort={sort}
              organizationSlug={organization.slug}
              projectSlug={project.slug}
              branchSlug={branch.slug}
            />
          </>
        )}

        {drawerKeyId !== null && (
          <TranslationKeyDrawer
            keyId={drawerKeyId}
            organizationSlug={organization.slug}
            projectSlug={project.slug}
            onClosed={handleDrawerClosed}
          />
        )}

        <TranslationKeyModal
          isOpen={isCreateKeyModalOpen}
          onOpenChange={setIsCreateKeyModalOpen}
          mode={TRANSLATIONS_KEY_MODEL_MODE.CREATE}
          error={
            actionData?.error && actionData.action === "createKey"
              ? actionData.error
              : undefined
          }
          isSubmitting={isSubmitting}
        />
      </VStack>
    </Container>
  );
}
