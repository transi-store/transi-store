import {
  Container,
  Heading,
  VStack,
  Button,
  Input,
  Field,
  Box,
  Text,
} from "@chakra-ui/react";
import { Form, useActionData, useNavigation, redirect } from "react-router";
import { LuPlus } from "react-icons/lu";
import type { Route } from "./+types/orgs.new";
import { requireUser } from "~/lib/session.server";
import {
  createOrganization,
  isSlugAvailable,
} from "~/lib/organizations.server";
import { generateSlug } from "~/lib/slug";
import { useState } from "react";

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();

  const name = formData.get("name");
  const customSlug = formData.get("slug");

  if (!name || typeof name !== "string") {
    return { error: "Le nom est requis" };
  }

  const slug = customSlug && typeof customSlug === "string"
    ? customSlug
    : generateSlug(name);

  // Vérifier que le slug est disponible
  const available = await isSlugAvailable(slug);
  if (!available) {
    return { error: `Le slug "${slug}" est deja utilise` };
  }

  // Créer l'organisation
  const organizationId = await createOrganization({
    name,
    slug,
    createdBy: user.userId,
  });

  return redirect(`/orgs/${slug}`);
}

export default function NewOrganization() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [name, setName] = useState("");
  const suggestedSlug = generateSlug(name);

  return (
    <Container maxW="container.md" py={10}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="2xl">
          Nouvelle organisation
        </Heading>

        {actionData?.error && (
          <Box p={4} bg="red.100" color="red.700" borderRadius="md">
            {actionData.error}
          </Box>
        )}

        <Form method="post">
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Nom de l'organisation</Field.Label>
              <Input
                name="name"
                placeholder="Mon entreprise"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Slug (optionnel)</Field.Label>
              <Input
                name="slug"
                placeholder={suggestedSlug || "mon-entreprise"}
                disabled={isSubmitting}
              />
              <Field.HelperText>
                {suggestedSlug && `Suggestion: ${suggestedSlug}`}
              </Field.HelperText>
              <Field.HelperText>
                Utilise dans l'URL (ex: /orgs/mon-entreprise)
              </Field.HelperText>
            </Field.Root>

            <Box display="flex" gap={3}>
              <Button
                type="submit"
                colorPalette="brand"
                loading={isSubmitting}
                flex={1}
              >
                <LuPlus /> Creer l'organisation
              </Button>
              <Button as="a" href="/orgs" variant="outline" disabled={isSubmitting}>
                Annuler
              </Button>
            </Box>
          </VStack>
        </Form>
      </VStack>
    </Container>
  );
}
