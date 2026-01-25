import {
  Container,
  Heading,
  VStack,
  Button,
  Box,
  Text,
} from "@chakra-ui/react";
import {
  useLoaderData,
  redirect,
  Link,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import { getUserFromSession } from "~/lib/session.server";
import {
  getInvitationByCode,
  acceptInvitation,
} from "~/lib/invitations.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const sessionUser = await getUserFromSession(request);

  if (!sessionUser) {
    // Rediriger vers la page de connexion avec redirection de retour
    const url = new URL(request.url);
    return redirect(`/auth/login?redirect=${encodeURIComponent(url.pathname)}`);
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

  if (invitation.status !== "pending") {
    throw new Response("Cette invitation n'est plus valide", { status: 410 });
  }

  return { invitation, sessionUser };
}

export default function AcceptInvitation() {
  const { invitation, sessionUser } = useLoaderData<typeof loader>();

  return (
    <Container maxW="container.md" py={20}>
      <VStack gap={8} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="2xl" mb={4}>
            Invitation à rejoindre une organisation
          </Heading>
          <Text color="gray.600">
            Vous avez été invité à rejoindre l'organisation
          </Text>
        </Box>

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
          <Text color="gray.600" mb={6}>
            /{invitation.organization!.slug}
          </Text>
          <Text fontSize="sm" color="gray.600">
            Invité par {invitation.inviter!.name || invitation.inviter!.email}
          </Text>
        </Box>

        {sessionUser ? (
          <VStack gap={4}>
            <Text textAlign="center">
              Vous êtes connecté en tant que{" "}
              <strong>{sessionUser.email}</strong>
            </Text>
            <form method="post" style={{ width: "100%" }}>
              <VStack gap={3}>
                <Button
                  type="submit"
                  colorScheme="brand"
                  size="lg"
                  width="100%"
                >
                  Accepter l'invitation
                </Button>
                <Button asChild variant="outline" size="lg" width="100%">
                  <Link to="/orgs">Retour aux organisations</Link>
                </Button>
              </VStack>
            </form>
          </VStack>
        ) : (
          <VStack gap={4}>
            <Text textAlign="center" color="gray.600">
              Vous devez être connecté pour accepter cette invitation
            </Text>
            <VStack gap={3} width="100%">
              <Button asChild colorScheme="brand" size="lg" width="100%">
                <Link
                  to={`/auth/login?redirect=${encodeURIComponent(
                    `/orgs/invite/${invitation.invitationCode}`,
                  )}`}
                >
                  Se connecter
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" width="100%">
                <Link
                  to={`/auth/login?redirect=${encodeURIComponent(
                    `/orgs/invite/${invitation.invitationCode}`,
                  )}`}
                >
                  Créer un compte
                </Link>
              </Button>
            </VStack>
          </VStack>
        )}
      </VStack>
    </Container>
  );
}
