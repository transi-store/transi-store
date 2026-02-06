import type { Route } from "./+types/auth.login";
import {
  AVAILABLE_PROVIDERS,
  type ProviderConfig,
} from "~/lib/auth-providers.server";
import {
  Alert,
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Link, useSearchParams } from "react-router";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { useTranslation } from "react-i18next";

export async function loader(): Promise<{ providers: Array<ProviderConfig> }> {
  return { providers: AVAILABLE_PROVIDERS };
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { providers } = loaderData;
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/orgs";
  const enabledProviders = providers.filter((p) => p.enabled);

  if (enabledProviders.length === 0) {
    return (
      <Container maxW="md" py={10}>
        <Box p={8} borderWidth={1} borderRadius="lg">
          <Heading size="lg" mb={4}>
            {t("auth.login.title")}
          </Heading>
          <Alert.Root status="warning">
            <Alert.Title>{t("auth.login.noProvidersDescription")}</Alert.Title>
          </Alert.Root>
        </Box>
      </Container>
    );
  }

  // Si un seul provider disponible, on pourrait rediriger automatiquement
  // Pour l'instant, on affiche toujours la page de choix

  return (
    <Container maxW="md" py={10}>
      <Box p={8} borderWidth={1} borderRadius="lg">
        <Heading size="lg" mb={2}>
          {t("auth.login.title")}
        </Heading>
        <Text mb={6}>{t("auth.login.chooseMethod")}</Text>
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
                      bg="#FFFFFF"
                      color="#1F1F1F"
                      border="1px solid #747775"
                      _dark={{
                        bg: "#131314",
                        color: "#E3E3E3",
                        border: "1px solid #8E918F",
                      }}
                      size="lg"
                    >
                      <Link
                        to={`/auth/google/login?redirectTo=${encodeURIComponent(redirectTo)}`}
                      >
                        <FaGoogle />{" "}
                        {t("auth.login.signInWith", {
                          provider: provider.name,
                        })}
                      </Link>
                    </Button>
                  );
                case "mapado":
                  return (
                    <Button
                      key={provider.type}
                      asChild
                      width="full"
                      bg="#00859c"
                      color="#f7f5f7"
                      size="lg"
                    >
                      <Link
                        to={`/auth/mapado/login?redirectTo=${encodeURIComponent(redirectTo)}`}
                      >
                        {t("auth.login.signInWith", {
                          provider: provider.name,
                        })}
                      </Link>
                    </Button>
                  );
                case "github":
                  return (
                    <Button
                      key={provider.type}
                      asChild
                      width="full"
                      bg="none"
                      color="#24292f"
                      border="1px solid rgba(13, 17, 23, 0.161)"
                      _dark={{
                        bg: "#1f2328",
                        color: "#ffffff",
                        border: "1px solid #1f2328",
                      }}
                      size="lg"
                    >
                      <Link
                        to={`/auth/github/login?redirectTo=${encodeURIComponent(redirectTo)}`}
                      >
                        <FaGithub />{" "}
                        {t("auth.login.signInWith", {
                          provider: provider.name,
                        })}
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
