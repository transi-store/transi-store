import type { Route } from "./+types/auth.login";
import { AVAILABLE_PROVIDERS } from "~/lib/auth-providers.server";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Link, useSearchParams } from "react-router";
import { FaGoogle } from "react-icons/fa";

export async function loader() {
  return { providers: AVAILABLE_PROVIDERS };
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { providers } = loaderData;
  const [searchParams] = useSearchParams();
  const redirectTo =
    searchParams.get("redirect") || searchParams.get("redirectTo") || "/orgs";
  const enabledProviders = providers.filter((p) => p.enabled);

  if (enabledProviders.length === 0) {
    return (
      <Container maxW="md" py={10}>
        <Box p={8} borderWidth={1} borderRadius="lg" bg="white">
          <Heading size="lg" mb={4}>
            Connexion
          </Heading>
          <Text color="red.500">
            Aucun provider OAuth n'est configuré. Veuillez configurer les
            variables d'environnement.
          </Text>
        </Box>
      </Container>
    );
  }

  // Si un seul provider disponible, on pourrait rediriger automatiquement
  // Pour l'instant, on affiche toujours la page de choix

  return (
    <Container maxW="md" py={10}>
      <Box p={8} borderWidth={1} borderRadius="lg" bg="white">
        <Heading size="lg" mb={2}>
          Connexion
        </Heading>
        <Text color="gray.600" mb={6}>
          Choisissez votre méthode de connexion
        </Text>
        <VStack gap={3}>
          {enabledProviders.map((provider) => {
            const getProviderButton = () => {
              switch (provider.type) {
                case "google":
                  return (
                    <Button
                      key={provider.type}
                      as={Link}
                      to={`/auth/google/login?redirectTo=${encodeURIComponent(redirectTo)}`}
                      width="full"
                      colorPalette="blue"
                      size="lg"
                      leftIcon={<FaGoogle />}
                    >
                      Se connecter avec Google
                    </Button>
                  );
                case "mapado":
                  return (
                    <Button
                      key={provider.type}
                      as={Link}
                      to={`/auth/mapado/login?redirectTo=${encodeURIComponent(redirectTo)}`}
                      width="full"
                      colorPalette="brand"
                      size="lg"
                    >
                      Se connecter avec {provider.name}
                    </Button>
                  );
                default:
                  return null;
              }
            };

            return getProviderButton();
          })}
        </VStack>
      </Box>
    </Container>
  );
}
