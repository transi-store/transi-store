import {
  Heading,
  VStack,
  Button,
  Box,
  Text,
  HStack,
  Input,
  Field,
  Textarea,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DialogBackdrop,
  DialogPositioner,
  Portal,
} from "@chakra-ui/react";
import {
  Link,
  useOutletContext,
  redirect,
  Form,
  useActionData,
  useNavigation,
} from "react-router";
import { useTranslation } from "react-i18next";
import { LuPlus } from "react-icons/lu";
import { useState, useEffect } from "react";
import type { Route } from "./+types/index";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import {
  getTranslationKeys,
  duplicateTranslationKey,
  createTranslationKey,
  getTranslationKeyByName,
} from "~/lib/translation-keys.server";
import { TranslationsSearchBar } from "./TranslationsSearchBar";
import { TranslationsTable } from "./TranslationsTable";
import { TranslationsPagination } from "./TranslationsPagination";
import { getInstance } from "~/middleware/i18next";

const LIMIT = 50;

type ContextType = {
  organization: { id: string; slug: string; name: string };
  project: { id: string; slug: string; name: string };
  languages: Array<{ id: string; locale: string; isDefault: boolean }>;
};

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

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const offset = (page - 1) * LIMIT;

  const keys = await getTranslationKeys(project.id, {
    search,
    limit: LIMIT,
    offset,
  });

  return { keys, search, page };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "duplicate") {
    const keyId = formData.get("keyId");

    if (!keyId || typeof keyId !== "string") {
      throw new Response("Key ID is required", { status: 400 });
    }

    const parsedKeyId = parseInt(keyId, 10);

    if (isNaN(parsedKeyId)) {
      throw new Response("Invalid Key ID", { status: 400 });
    }

    const newKeyId = await duplicateTranslationKey(parsedKeyId);

    return redirect(
      `/orgs/${params.orgSlug}/projects/${params.projectSlug}/keys/${newKeyId}`,
    );
  }

  if (action === "createKey") {
    const keyName = formData.get("keyName");
    const description = formData.get("description");

    if (!keyName || typeof keyName !== "string") {
      return {
        error: i18next.t("keys.new.errors.nameRequired"),
        action: "createKey",
      };
    }

    // Vérifier que la clé n'existe pas déjà
    const existing = await getTranslationKeyByName(project.id, keyName);
    if (existing) {
      return {
        error: i18next.t("keys.new.errors.alreadyExists", { keyName }),
        action: "createKey",
      };
    }

    // Créer la clé
    await createTranslationKey({
      projectId: project.id,
      keyName,
      description:
        description && typeof description === "string"
          ? description
          : undefined,
    });

    // Rediriger vers la page de traductions avec le filtre de recherche pour afficher la nouvelle clé
    return redirect(
      `/orgs/${params.orgSlug}/projects/${params.projectSlug}/translations?search=${encodeURIComponent(keyName)}`,
    );
  }

  return { error: "Action inconnue" };
}

export default function ProjectTranslations({
  loaderData,
}: Route.ComponentProps) {
  const { t } = useTranslation();
  const {
    keys: { data, count },
    search,
    page,
  } = loaderData;
  const { organization, project, languages } = useOutletContext<ContextType>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);

  const totalLanguages = languages.length;

  // Build redirect URL with current search params
  const currentUrl = `/orgs/${organization.slug}/projects/${project.slug}/translations${search ? `?search=${encodeURIComponent(search)}` : ""}`;

  // Close modal after successful creation (when redirecting)
  useEffect(() => {
    if (
      actionData &&
      !("error" in actionData) &&
      navigation.state === "idle"
    ) {
      setIsCreateKeyModalOpen(false);
    }
  }, [actionData, navigation.state]);

  // Keep modal open if there's an error for createKey action
  useEffect(() => {
    if (
      actionData &&
      "error" in actionData &&
      actionData.action === "createKey"
    ) {
      setIsCreateKeyModalOpen(true);
    }
  }, [actionData]);

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between">
        <Box>
          <Heading as="h2" size="lg">
            {t("translations.title")}
          </Heading>
          <Text color="gray" mt={2}>
            {t("translations.count", { count })}
          </Text>
        </Box>
        {languages.length > 0 && (
          <Button
            colorPalette="accent"
            onClick={() => setIsCreateKeyModalOpen(true)}
          >
            <LuPlus /> {t("translations.newKey")}
          </Button>
        )}
      </HStack>

      <TranslationsSearchBar
        search={search}
        organizationSlug={organization.slug}
        projectSlug={project.slug}
      />

      {languages.length === 0 ? (
        <Box p={10} textAlign="center" borderWidth={1} borderRadius="lg">
          <Text color="fg.muted" mb={4}>
            {t("translations.noLanguages")}
          </Text>
          <Button asChild colorPalette="brand">
            <Link
              to={`/orgs/${organization.slug}/projects/${project.slug}/settings`}
            >
              {t("translations.manageLanguages")}
            </Link>
          </Button>
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
          />

          <TranslationsPagination
            count={count}
            pageSize={LIMIT}
            currentPage={page}
            search={search}
            organizationSlug={organization.slug}
            projectSlug={project.slug}
          />
        </>
      )}

      {/* Modale de création de clé */}
      <DialogRoot
        open={isCreateKeyModalOpen}
        onOpenChange={(e) => setIsCreateKeyModalOpen(e.open)}
      >
        <Portal>
          <DialogBackdrop />
          <DialogPositioner>
            <DialogContent>
              <Form method="post">
                <input type="hidden" name="_action" value="createKey" />
                <DialogHeader>
                  <DialogTitle>{t("keys.new.title")}</DialogTitle>
                </DialogHeader>
                <DialogCloseTrigger />
                <DialogBody pb={6}>
                  {actionData?.error && actionData.action === "createKey" && (
                    <Box
                      p={4}
                      bg="red.subtle"
                      color="red.fg"
                      borderRadius="md"
                      mb={4}
                    >
                      {actionData.error}
                    </Box>
                  )}
                  <VStack gap={4} align="stretch">
                    <Field.Root required>
                      <Field.Label>{t("keys.new.nameLabel")}</Field.Label>
                      <Input
                        name="keyName"
                        placeholder={t("keys.new.namePlaceholder")}
                        disabled={isSubmitting}
                        fontFamily="mono"
                      />
                      <Field.HelperText>
                        {t("keys.new.nameHelper")}
                      </Field.HelperText>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>
                        {t("keys.new.descriptionLabel")}
                      </Field.Label>
                      <Textarea
                        name="description"
                        placeholder={t("keys.edit.descriptionPlaceholder")}
                        disabled={isSubmitting}
                        rows={3}
                      />
                    </Field.Root>
                  </VStack>
                </DialogBody>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateKeyModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    {t("settings.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    colorPalette="brand"
                    loading={isSubmitting}
                  >
                    {t("keys.new.create")}
                  </Button>
                </DialogFooter>
              </Form>
            </DialogContent>
          </DialogPositioner>
        </Portal>
      </DialogRoot>
    </VStack>
  );
}
