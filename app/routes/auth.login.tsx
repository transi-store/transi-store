import type { Route } from "./+types/auth.login";
import { AVAILABLE_PROVIDERS, type ProviderConfig } from "~/lib/auth-providers.server";
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
import { useTranslation } from "react-i18next";

export async function loader(): Promise<{ providers: Array<ProviderConfig> }> {
  return { providers: AVAILABLE_PROVIDERS };
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { providers } = loaderData;
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const redirectTo =
    searchParams.get("redirect") || searchParams.get("redirectTo") || "/orgs";
  const enabledProviders = providers.filter((p) => p.enabled);

  if (enabledProviders.length === 0) {
    return (
      <Container maxW="md" py={10}>
        <Box p={8} borderWidth={1} borderRadius="lg" bg="white">
          <Heading size="lg" mb={4}>
            {t("auth.login.title")}
          </Heading>
          <Text color="red.500">
            {t("auth.login.noProvidersDescription")}
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
          {t("auth.login.title")}
        </Heading>
        <Text color="gray.600" mb={6}>
          {t("auth.login.chooseMethod")}
        </Text>
        <VStack gap={3}>
          {enabledProviders.map((provider) => {
            const getProviderButton = () => {
              switch (provider.type) {
                case "google":
                  return (
                  <Button
                    key={provider.type}
                    asChild
                    width="full"
                    colorPalette="blue"
                    size="lg"
                  >
                    <Link
                      to={`/auth/google/login?redirectTo=${encodeURIComponent(redirectTo)}`}
                    >
                      <FaGoogle /> {t("auth.login.signInWith", { provider: provider.name })}
                    </Link>
                  </Button>
                );
                case "mapado":
                return (
                  <Button
                    key={provider.type}
                    asChild
                    width="full"
                    colorPalette="brand"
                    size="lg"
                  >
                    <Link
                      to={`/auth/mapado/login?redirectTo=${encodeURIComponent(redirectTo)}`}
                    >
                      {t("auth.login.signInWith", { provider: provider.name })}
                    </Link>
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
