import {
  Container,
  Heading,
  VStack,
  Button,
  Box,
  Text,
  Alert,
} from "@chakra-ui/react";
import {
  useLoaderData,
  redirect,
  Link,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  useActionData,
} from "react-router";
import { getUserFromSession } from "~/lib/session.server";
import {
  getInvitationByCode,
  acceptInvitation,
} from "~/lib/invitations.server";
import { useTranslation } from "react-i18next";

export async function action({ request, params }: ActionFunctionArgs) {
  const sessionUser = await getUserFromSession(request);

  if (!sessionUser) {
    // Rediriger vers la page de connexion avec redirection de retour
    const url = new URL(request.url);
    return redirect(
      `/auth/login?redirectTo=${encodeURIComponent(url.pathname)}`,
    );
  }

  try {
    const organization = await acceptInvitation(
      params.code!,
      sessionUser.userId,
    );

    // Rediriger vers l'organisation
    return redirect(`/orgs/${organization.slug}`);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de l'acceptation de l'invitation",
    };
  }
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const sessionUser = await getUserFromSession(request);

  // Récupérer l'invitation
  const invitation = await getInvitationByCode(params.code!);

  if (!invitation) {
    throw new Response("Invitation introuvable", { status: 404 });
  }

  return { invitation, sessionUser };
}

export default function AcceptInvitation() {
  const { invitation, sessionUser } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { t } = useTranslation();

  return (
    <Container maxW="container.md" py={20}>
      <VStack gap={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="2xl" mb={4}>
            {t("invite.code.title")}
          </Heading>
          <Text color="gray.600">{t("invite.code.description")}</Text>
        </Box>

        {actionData?.error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{t("error")}</Alert.Title>
              <Alert.Description>{actionData.error}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <Box
          p={8}
          borderWidth={1}
          borderRadius="lg"
          bg="gray.50"
          textAlign="center"
        >
          <Heading as="h2" size="xl" mb={2}>
            {invitation.organization!.name}
          </Heading>
          {invitation.isUnlimited ? (
            <Text fontSize="sm" color="gray.600">
              {t("invite.code.unlimitedLink")}
            </Text>
          ) : (
            <Text fontSize="sm" color="gray.600">
              {t("invite.code.invitedBy", {
                name: invitation.inviter?.name || invitation.inviter?.email,
              })}
            </Text>
          )}
        </Box>

        {sessionUser ? (
          <VStack gap={4}>
            <Text textAlign="center">
              {t("invite.code.loggedInAs")}
              <strong>{sessionUser.email}</strong>
            </Text>
            <form method="post" style={{ width: "100%" }}>
              <VStack gap={3}>
                <Button
                  type="submit"
                  colorPalette="brand"
                  size="lg"
                  width="100%"
                >
                  {t("invite.code.acceptInvite")}
                </Button>
                <Button asChild variant="outline" size="lg" width="100%">
                  <Link to="/orgs">{t("invite.code.backToOrgs")}</Link>
                </Button>
              </VStack>
            </form>
          </VStack>
        ) : (
          <VStack gap={4}>
            <Text textAlign="center" color="gray.600">
              {t("invite.code.mustBeLoggedIn")}
            </Text>
            <VStack gap={3} width="100%">
              <Button asChild colorPalette="brand" size="lg" width="100%">
                <Link
                  to={`/auth/login?redirectTo=${encodeURIComponent(
                    `/orgs/invite/${invitation.invitationCode}`,
                  )}`}
                >
                  {t("auth.login.title")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" width="100%">
                <Link
                  to={`/auth/login?redirectTo=${encodeURIComponent(
                    `/orgs/invite/${invitation.invitationCode}`,
                  )}`}
                >
                  {t("auth.register")}
                </Link>
              </Button>
            </VStack>
          </VStack>
        )}
      </VStack>
    </Container>
  );
}
