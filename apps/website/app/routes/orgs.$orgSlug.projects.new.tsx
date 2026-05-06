import {
  Container,
  Heading,
  VStack,
  Button,
  Input,
  Field,
  Box,
  RadioGroup,
  Text,
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
import { LuPlus } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.projects.new";
import { userContext } from "~/middleware/auth.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { createProject, isProjectSlugAvailable } from "~/lib/projects.server";
import { generateSlug } from "~/lib/slug";
import { useState } from "react";
import { getInstance } from "~/middleware/i18next.server";
import { getProjectUrl } from "~/lib/routes-helpers";
import { ProjectVisibility } from "~/lib/project-visibility";

export async function loader({ params, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  return { organization };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);

  const user = context.get(userContext);
  const organization = await requireOrganizationMembership(
    user,
    params.orgSlug,
  );

  const formData = await request.formData();
  const name = formData.get("name");
  const customSlug = formData.get("slug");
  const description = formData.get("description");
  const visibilityInput = formData.get("visibility");
  const visibility =
    visibilityInput === ProjectVisibility.PUBLIC
      ? ProjectVisibility.PUBLIC
      : ProjectVisibility.PRIVATE;

  if (!name || typeof name !== "string") {
    return { error: i18next.t("projects.new.errors.nameRequired") };
  }

  const slug =
    customSlug && typeof customSlug === "string"
      ? customSlug
      : generateSlug(name);

  // Vérifier que le slug est disponible dans cette organisation
  const available = await isProjectSlugAvailable(organization.id, slug);
  if (!available) {
    return {
      error: i18next.t("projects.new.errors.slugTaken", { slug }),
    };
  }

  // Créer le projet
  await createProject({
    organizationId: organization.id,
    name,
    slug,
    description:
      description && typeof description === "string" ? description : undefined,
    createdBy: user.userId,
    visibility,
  });

  return redirect(getProjectUrl(params.orgSlug, slug));
}

export default function NewProject({ loaderData }: Route.ComponentProps) {
  const { organization } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [name, setName] = useState("");
  const suggestedSlug = generateSlug(name);
  const { t } = useTranslation();

  return (
    <Container maxW="container.md" py={10}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="2xl">
          {t("projects.new.title")}
        </Heading>

        {actionData?.error && (
          <Box p={4} bg="red.subtle" color="red.fg" borderRadius="md">
            {actionData.error}
          </Box>
        )}

        <Form method="post">
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>{t("projects.new.nameLabel")}</Field.Label>
              <Input
                name="name"
                placeholder={t("projects.new.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Slug (optionnel)</Field.Label>
              <Input
                name="slug"
                placeholder={suggestedSlug || "mon-application"}
                disabled={isSubmitting}
              />
              <Field.HelperText>
                {suggestedSlug && `Suggestion: ${suggestedSlug}`}
              </Field.HelperText>
            </Field.Root>

            <Field.Root>
              <Field.Label>{t("projects.new.descriptionLabel")}</Field.Label>
              <Textarea
                name="description"
                placeholder={t("projects.new.descriptionPlaceholder")}
                disabled={isSubmitting}
                rows={3}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>{t("projects.visibility.label")}</Field.Label>
              <RadioGroup.Root
                name="visibility"
                defaultValue={ProjectVisibility.PRIVATE}
              >
                <VStack align="stretch" gap={2}>
                  <RadioGroup.Item value={ProjectVisibility.PRIVATE}>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemIndicator />
                    <RadioGroup.ItemText>
                      <Box>
                        <Text fontWeight="medium">
                          {t("projects.visibility.private")}
                        </Text>
                        <Text fontSize="sm" color="fg.muted">
                          {t("projects.visibility.privateDescription")}
                        </Text>
                      </Box>
                    </RadioGroup.ItemText>
                  </RadioGroup.Item>
                  <RadioGroup.Item value={ProjectVisibility.PUBLIC}>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemIndicator />
                    <RadioGroup.ItemText>
                      <Box>
                        <Text fontWeight="medium">
                          {t("projects.visibility.public")}
                        </Text>
                        <Text fontSize="sm" color="fg.muted">
                          {t("projects.visibility.publicDescription")}
                        </Text>
                      </Box>
                    </RadioGroup.ItemText>
                  </RadioGroup.Item>
                </VStack>
              </RadioGroup.Root>
            </Field.Root>

            <Box display="flex" gap={3}>
              <Button
                type="submit"
                colorPalette="brand"
                loading={isSubmitting}
                flex={1}
              >
                <LuPlus /> {t("projects.new.create")}
              </Button>
              <Button asChild variant="outline" disabled={isSubmitting}>
                <Link to={`/orgs/${organization.slug}`}>{t("cancel")}</Link>
              </Button>
            </Box>
          </VStack>
        </Form>
      </VStack>
    </Container>
  );
}
