import {
  Container,
  Heading,
  VStack,
  Button,
  Input,
  Field,
  Box,
  Textarea,
} from "@chakra-ui/react";
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  redirect,
} from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.keys.new";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import {
  createTranslationKey,
  getTranslationKeyByName,
} from "~/lib/translation-keys.server";
import { getTranslationsUrl, getKeyUrl } from "~/lib/routes-helpers";
import { getInstance } from "~/middleware/i18next";

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

  return { organization, project };
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
  const keyName = formData.get("keyName");
  const description = formData.get("description");

  if (!keyName || typeof keyName !== "string") {
    return {
      error: i18next.t("keys.new.errors.nameRequired"),
    };
  }

  // Vérifier que la clé n'existe pas déjà
  const existing = await getTranslationKeyByName(project.id, keyName);
  if (existing) {
    return {
      error: i18next.t("keys.new.errors.alreadyExists", { keyName }),
    };
  }

  // Créer la clé
  const keyId = await createTranslationKey({
    projectId: project.id,
    keyName,
    description:
      description && typeof description === "string" ? description : undefined,
  });

  // Construire l'URL de redirection vers la recherche
  const redirectUrl = getTranslationsUrl(
    params.orgSlug,
    params.projectSlug,
    keyName,
  );

  // Rediriger vers la page de modification de la clé avec l'URL de recherche en redirect
  return redirect(
    `${getKeyUrl(params.orgSlug, params.projectSlug, keyId)}?redirectTo=${encodeURIComponent(redirectUrl)}`,
  );
}

export default function NewTranslationKey({
  loaderData,
}: Route.ComponentProps) {
  const { organization, project } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { t } = useTranslation();

  return (
    <Container maxW="container.md" py={10}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="2xl">
          {t("keys.new.title")}
        </Heading>

        {actionData?.error && (
          <Box p={4} bg="red.subtle" color="red.fg" borderRadius="md">
            {actionData.error}
          </Box>
        )}

        <Form method="post">
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>{t("keys.new.nameLabel")}</Field.Label>
              <Input
                name="keyName"
                placeholder={t("keys.new.namePlaceholder")}
                disabled={isSubmitting}
                fontFamily="mono"
              />
              <Field.HelperText>{t("keys.new.nameHelper")}</Field.HelperText>
            </Field.Root>

            <Field.Root>
              <Field.Label>{t("keys.new.descriptionLabel")}</Field.Label>
              <Textarea
                name="description"
                placeholder={t("keys.edit.descriptionPlaceholder")}
                disabled={isSubmitting}
                rows={3}
              />
            </Field.Root>

            <Box display="flex" gap={3}>
              <Button
                type="submit"
                colorPalette="brand"
                loading={isSubmitting}
                flex={1}
              >
                {t("keys.new.create")}
              </Button>
              <Button asChild variant="outline" disabled={isSubmitting}>
                <Link to={getTranslationsUrl(organization.slug, project.slug)}>
                  {t("settings.cancel")}
                </Link>
              </Button>
            </Box>
          </VStack>
        </Form>
      </VStack>
    </Container>
  );
}
