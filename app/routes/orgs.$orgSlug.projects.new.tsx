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
import { Form, useActionData, useNavigation, redirect } from "react-router";
import { LuPlus } from "react-icons/lu";
import type { Route } from "./+types/orgs.$orgSlug.projects.new";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import {
  createProject,
  isProjectSlugAvailable,
} from "~/lib/projects.server";
import { generateSlug } from "~/lib/slug";
import { useState } from "react";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, params.orgSlug);

  return { organization };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, params.orgSlug);

  const formData = await request.formData();
  const name = formData.get("name");
  const customSlug = formData.get("slug");
  const description = formData.get("description");

  if (!name || typeof name !== "string") {
    return { error: "Le nom est requis" };
  }

  const slug =
    customSlug && typeof customSlug === "string"
      ? customSlug
      : generateSlug(name);

  // Vérifier que le slug est disponible dans cette organisation
  const available = await isProjectSlugAvailable(organization.id, slug);
  if (!available) {
    return { error: `Le slug "${slug}" est deja utilise dans cette organisation` };
  }

  // Créer le projet
  await createProject({
    organizationId: organization.id,
    name,
    slug,
    description: description && typeof description === "string" ? description : undefined,
    createdBy: user.userId,
  });

  return redirect(`/orgs/${params.orgSlug}/projects/${slug}`);
}

export default function NewProject({ loaderData }: Route.ComponentProps) {
  const { organization } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [name, setName] = useState("");
  const suggestedSlug = generateSlug(name);

  return (
    <Container maxW="container.md" py={10}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="2xl">
          Nouveau projet
        </Heading>

        {actionData?.error && (
          <Box p={4} bg="red.100" color="red.700" borderRadius="md">
            {actionData.error}
          </Box>
        )}

        <Form method="post">
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Nom du projet</Field.Label>
              <Input
                name="name"
                placeholder="Mon application"
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
              <Field.Label>Description (optionnel)</Field.Label>
              <Textarea
                name="description"
                placeholder="Description du projet..."
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
                <LuPlus /> Creer le projet
              </Button>
              <Button
                as="a"
                href={`/orgs/${organization.slug}`}
                variant="outline"
                disabled={isSubmitting}
              >
                Annuler
              </Button>
            </Box>
          </VStack>
        </Form>
      </VStack>
    </Container>
  );
}
