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
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/auth.complete-profile";
import { requireUser } from "~/lib/session.server";
import { updateUserName, getUserById } from "~/lib/auth.server";
import { createUserSession } from "~/lib/session.server";
import { getInstance } from "~/middleware/i18next";

export async function loader({ request }: Route.LoaderArgs) {
  const sessionUser = await requireUser(request);
  const dbUser = await getUserById(sessionUser.userId);

  if (!dbUser) {
    throw new Response("User not found", { status: 404 });
  }

  // Si a déjà un name, redirect
  if (dbUser.name) {
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get("redirectTo") || "/";
    return redirect(redirectTo);
  }

  return { email: dbUser.email };
}

export async function action({ request, context }: Route.ActionArgs) {
  const i18next = getInstance(context);

  const sessionUser = await requireUser(request);
  const formData = await request.formData();

  const name = formData.get("name");
  const redirectTo = formData.get("redirectTo") || "/";

  // Validation
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return { error: i18next.t("auth.completeProfile.errors.nameRequired") };
  }

  if (name.trim().length < 2) {
    return { error: i18next.t("auth.completeProfile.errors.nameTooShort") };
  }

  // Update DB
  await updateUserName(sessionUser.userId, name.trim());

  // Créer nouvelle session avec name
  return createUserSession(
    sessionUser.userId,
    sessionUser.email,
    name.trim(),
    typeof redirectTo === "string" ? redirectTo : "/",
  );
}

export default function CompleteProfile() {
  const { t } = useTranslation();
  const { email } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";
  const redirectTo = searchParams.get("redirectTo") || "/";

  return (
    <Container maxW="container.sm" py={10}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading as="h1" size="2xl">
            {t("auth.completeProfile.title")}
          </Heading>
          <Text fontSize="md" color="fg.muted" mt={2}>
            {t("auth.completeProfile.description")}
          </Text>
        </Box>

        {actionData?.error && (
          <Box p={4} bg="red.subtle" color="red.fg" borderRadius="md">
            {actionData.error}
          </Box>
        )}

        <Box p={6} borderWidth={1} borderRadius="lg" bg="bg.subtle">
          <Text fontSize="sm" color="fg.muted">
            Connecté en tant que: <strong>{email}</strong>
          </Text>
        </Box>

        <Form method="post">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>
                {t("auth.completeProfile.fullNameLabel")}
              </Field.Label>
              <Input
                name="name"
                placeholder={t("auth.completeProfile.namePlaceholder")}
                disabled={isSubmitting}
                autoFocus
                required
              />
              <Field.HelperText>
                {t("auth.completeProfile.nameHelper")}
              </Field.HelperText>
            </Field.Root>

            <Button
              type="submit"
              colorPalette="brand"
              loading={isSubmitting}
              width="100%"
            >
              {t("auth.completeProfile.submit")}
            </Button>
          </VStack>
        </Form>
      </VStack>
    </Container>
  );
}
