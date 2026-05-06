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
import { LuPlus } from "react-icons/lu";
import { useState } from "react";
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.branches.new";
import { userContext } from "~/middleware/auth";
import {
  organizationContext,
  projectContext,
} from "~/middleware/project-access";
import { createBranch, isBranchSlugAvailable } from "~/lib/branches.server";
import { generateSlug } from "~/lib/slug";
import { getInstance } from "~/middleware/i18next";
import { getBranchesUrl, getBranchUrl } from "~/lib/routes-helpers";

export async function loader({ context }: Route.LoaderArgs) {
  const organization = context.get(organizationContext);
  const project = context.get(projectContext);

  return { organization, project };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const i18next = getInstance(context);
  const user = context.get(userContext);
  const project = context.get(projectContext);

  const formData = await request.formData();
  const name = formData.get("name");
  const customSlug = formData.get("slug");
  const description = formData.get("description");

  if (!name || typeof name !== "string") {
    return { error: i18next.t("branches.errors.nameRequired") };
  }

  const slug =
    customSlug && typeof customSlug === "string"
      ? customSlug
      : generateSlug(name);

  const available = await isBranchSlugAvailable(project.id, slug);
  if (!available) {
    return {
      error: i18next.t("branches.errors.slugTaken", { slug }),
    };
  }

  const branch = await createBranch({
    projectId: project.id,
    name,
    slug,
    description:
      description && typeof description === "string" ? description : undefined,
    createdBy: user.userId,
  });

  return redirect(
    getBranchUrl(params.orgSlug, params.projectSlug, branch.slug),
  );
}

export default function NewBranch({ loaderData }: Route.ComponentProps) {
  const { organization, project } = loaderData;
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
          {t("branches.new.title")}
        </Heading>

        {actionData?.error && (
          <Box p={4} bg="red.subtle" color="red.fg" borderRadius="md">
            {actionData.error}
          </Box>
        )}

        <Form method="post">
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>{t("branches.new.nameLabel")}</Field.Label>
              <Input
                name="name"
                placeholder={t("branches.new.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Slug</Field.Label>
              <Input
                name="slug"
                placeholder={suggestedSlug || "feature-new-onboarding"}
                disabled={isSubmitting}
              />
              <Field.HelperText>
                {suggestedSlug && `Suggestion: ${suggestedSlug}`}
              </Field.HelperText>
            </Field.Root>

            <Field.Root>
              <Field.Label>{t("branches.new.descriptionLabel")}</Field.Label>
              <Textarea
                name="description"
                placeholder={t("branches.new.descriptionPlaceholder")}
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
                <LuPlus /> {t("branches.create")}
              </Button>
              <Button asChild variant="outline" disabled={isSubmitting}>
                <Link to={getBranchesUrl(organization.slug, project.slug)}>
                  {t("cancel")}
                </Link>
              </Button>
            </Box>
          </VStack>
        </Form>
      </VStack>
    </Container>
  );
}
