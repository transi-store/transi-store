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
import {
  Form,
  useActionData,
  useNavigation,
  redirect,
  useSearchParams,
  useLoaderData,
} from "react-router";
import type { Route } from "./+types/auth.complete-profile";
import { requireUser } from "~/lib/session.server";
import { updateUserName, getUserById } from "~/lib/auth.server";
import { createUserSession } from "~/lib/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const sessionUser = await requireUser(request);
  const dbUser = await getUserById(sessionUser.userId);

  if (!dbUser) {
    throw new Response("User not found", { status: 404 });
  }

  // Si a déjà un name, redirect
  if (dbUser.name) {
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get("redirectTo") || "/orgs";
    return redirect(redirectTo);
  }

  return { email: dbUser.email };
}

export async function action({ request }: Route.ActionArgs) {
  const sessionUser = await requireUser(request);
  const formData = await request.formData();

  const name = formData.get("name");
  const redirectTo = formData.get("redirectTo") || "/orgs";

  // Validation
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return { error: "Le nom complet est requis" };
  }

  if (name.trim().length < 2) {
    return { error: "Le nom doit contenir au moins 2 caractères" };
  }

  // Update DB
  await updateUserName(sessionUser.userId, name.trim());

  // Créer nouvelle session avec name
  return createUserSession(
    sessionUser.userId,
    sessionUser.email,
    name.trim(),
    typeof redirectTo === "string" ? redirectTo : "/orgs",
  );
}

export default function CompleteProfile() {
  const { email } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";
  const redirectTo = searchParams.get("redirectTo") || "/orgs";

  return (
    <Container maxW="container.sm" py={10}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading as="h1" size="2xl">
            Complétez votre profil
          </Heading>
          <Text fontSize="md" color="gray.600" mt={2}>
            Veuillez indiquer votre nom complet pour continuer
          </Text>
        </Box>

        {actionData?.error && (
          <Box p={4} bg="red.100" color="red.700" borderRadius="md">
            {actionData.error}
          </Box>
        )}

        <Box p={6} borderWidth={1} borderRadius="lg" bg="gray.50">
          <Text fontSize="sm" color="gray.600">
            Connecté en tant que: <strong>{email}</strong>
          </Text>
        </Box>

        <Form method="post">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Nom complet</Field.Label>
              <Input
                name="name"
                placeholder="Jean Dupont"
                disabled={isSubmitting}
                autoFocus
                required
              />
              <Field.HelperText>
                Ce nom sera affiché dans l'application
              </Field.HelperText>
            </Field.Root>

            <Button
              type="submit"
              colorPalette="brand"
              loading={isSubmitting}
              width="100%"
            >
              Continuer
            </Button>
          </VStack>
        </Form>
      </VStack>
    </Container>
  );
}
