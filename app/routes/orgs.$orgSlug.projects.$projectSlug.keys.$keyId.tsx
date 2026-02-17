import { Container, VStack, Button, Box, HStack } from "@chakra-ui/react";
import { Form, useNavigation, redirect, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LuTrash2 } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.keys.$keyId";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug, getProjectLanguages } from "~/lib/projects.server";
import {
  getTranslationKeyById,
  getTranslationsForKey,
  upsertTranslation,
  deleteTranslationKey,
  updateTranslationKey,
  deleteTranslation,
  getTranslationKeyByName,
} from "~/lib/translation-keys.server";
import { getActiveAiProvider } from "~/lib/ai-providers.server";
import {
  getRedirectUrlFromRequest,
  getRedirectUrlFromFormData,
} from "~/lib/routes-helpers";
import { getInstance } from "~/middleware/i18next";
import { TranslationKeyContent } from "~/components/translation-key";
import type {
  Organization,
  Project,
  ProjectLanguage,
  Translation,
  TranslationKey,
} from "../../drizzle/schema";

export type KeyLoaderData = {
  organization: Organization;
  project: Project;
  key: TranslationKey;
  languages: Array<ProjectLanguage>;
  translations: Array<Translation>;
  hasAiProvider: boolean;
  redirectUrl: string;
};

export async function loader({
  request,
  params,
}: Route.LoaderArgs): Promise<KeyLoaderData> {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const key = await getTranslationKeyById(parseInt(params.keyId, 10));

  if (!key || key.projectId !== project.id) {
    throw new Response("Translation key not found", { status: 404 });
  }

  const languages = await getProjectLanguages(project.id);
  const translations = await getTranslationsForKey(key.id);

  // Vérifier si un provider IA est configuré
  const activeAiProvider = await getActiveAiProvider(organization.id);
  const hasAiProvider = activeAiProvider !== null;

  const redirectUrl = getRedirectUrlFromRequest(
    request,
    params.orgSlug,
    params.projectSlug,
  );

  return {
    organization,
    project,
    key,
    languages,
    translations,
    redirectUrl,
    hasAiProvider,
  };
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

  const key = await getTranslationKeyById(parseInt(params.keyId, 10));

  if (!key || key.projectId !== project.id) {
    throw new Response("Translation key not found", { status: 404 });
  }

  const formData = await request.formData();
  const action = formData.get("_action");

  if (request.method === "DELETE") {
    await deleteTranslationKey(key.id);

    const redirectUrl = getRedirectUrlFromFormData(
      formData,
      params.orgSlug,
      params.projectSlug,
    );

    return redirect(redirectUrl);
  }

  if (action === "editKey") {
    const keyName = formData.get("keyName");
    const description = formData.get("description");

    if (!keyName || typeof keyName !== "string") {
      return {
        error: i18next.t("keys.new.errors.nameRequired"),
        action,
      };
    }

    // Vérifier que la clé n'existe pas déjà
    const existing = await getTranslationKeyByName(project.id, keyName);
    if (existing && existing.id !== key.id) {
      return {
        error: i18next.t("keys.new.errors.alreadyExists", { keyName }),
        action,
      };
    }

    await updateTranslationKey({
      keyId: key.id,
      keyName,
      description: typeof description === "string" ? description : undefined,
    });

    return { success: true };
  }

  if (action === "saveTranslation") {
    const locale = formData.get("locale");
    const value = formData.get("value");
    const isFuzzy = formData.get("isFuzzy");

    if (locale && typeof locale === "string") {
      if (value && typeof value === "string" && value.trim()) {
        // Save the translation
        await upsertTranslation({
          keyId: key.id,
          locale: locale,
          value: value.trim(),
          isFuzzy: isFuzzy === "true",
        });
      } else {
        // Delete the translation if the value is empty
        await deleteTranslation(key.id, locale);
      }
    }

    return { success: true };
  }

  return { error: i18next.t("keys.errors.unknownAction") };
}

export default function EditTranslationKey({
  loaderData,
}: Route.ComponentProps) {
  const {
    organization,
    project,
    key,
    languages,
    translations,
    redirectUrl,
    hasAiProvider,
  } = loaderData;
  const navigation = useNavigation();
  const { t } = useTranslation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Container maxW="container.md" py={10}>
      <VStack gap={6} align="stretch">
        <HStack justify="flex-end">
          <Form method="delete">
            <input type="hidden" name="redirectUrl" value={redirectUrl} />
            <Button
              type="submit"
              colorPalette="red"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
            >
              <LuTrash2 /> {t("keys.delete")}
            </Button>
          </Form>
        </HStack>

        <TranslationKeyContent
          translationKey={key}
          languages={languages}
          translations={translations}
          organization={organization}
          project={project}
          hasAiProvider={hasAiProvider}
        />

        <Box display="flex" gap={3}>
          <Button asChild variant="outline" disabled={isSubmitting}>
            <Link to={redirectUrl}>{t("project.back")}</Link>
          </Button>
        </Box>
      </VStack>
    </Container>
  );
}
