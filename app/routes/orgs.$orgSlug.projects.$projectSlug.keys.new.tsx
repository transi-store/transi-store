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
import type { Route } from "./+types/orgs.$orgSlug.projects.$projectSlug.keys.new";
import { requireUser } from "~/lib/session.server";
import { requireOrganizationMembership } from "~/lib/organizations.server";
import { getProjectBySlug } from "~/lib/projects.server";
import {
  createTranslationKey,
  getTranslationKeyByName,
} from "~/lib/translation-keys.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, params.orgSlug);

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  return { organization, project };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);
  const organization = await requireOrganizationMembership(user, params.orgSlug);

  const project = await getProjectBySlug(organization.id, params.projectSlug);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const formData = await request.formData();
  const keyName = formData.get("keyName");
  const description = formData.get("description");

  if (!keyName || typeof keyName !== "string") {
    return { error: "Le nom de la clé est requis" };
  }

  // Vérifier que la clé n'existe pas déjà
  const existing = await getTranslationKeyByName(project.id, keyName);
  if (existing) {
    return { error: `La clé "${keyName}" existe déjà dans ce projet` };
  }

  // Créer la clé
  const keyId = await createTranslationKey({
    projectId: project.id,
    keyName,
    description: description && typeof description === "string" ? description : undefined,
  });

  return redirect(
    `/orgs/${params.orgSlug}/projects/${params.projectSlug}/keys/${keyId}`
  );
}

export default function NewTranslationKey({ loaderData }: Route.ComponentProps) {
  const { organization, project } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Container maxW="container.md" py={10}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="2xl">
          Nouvelle clé de traduction
        </Heading>

        {actionData?.error && (
          <Box p={4} bg="red.100" color="red.700" borderRadius="md">
            {actionData.error}
          </Box>
        )}

        <Form method="post">
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Nom de la clé</Field.Label>
              <Input
                name="keyName"
                placeholder="app.welcome.title"
                disabled={isSubmitting}
                fontFamily="mono"
              />
              <Field.HelperText>
                Utilisez des points pour structurer vos clés (ex: app.welcome.title)
              </Field.HelperText>
            </Field.Root>

            <Field.Root>
              <Field.Label>Description (optionnel)</Field.Label>
              <Textarea
                name="description"
                placeholder="Description de cette clé..."
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
                Créer la clé
              </Button>
              <Button
                as="a"
                href={`/orgs/${organization.slug}/projects/${project.slug}/keys`}
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
