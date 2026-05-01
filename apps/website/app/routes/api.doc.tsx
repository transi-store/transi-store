import { lazy, Suspense } from "react";
import { Box, Spinner } from "@chakra-ui/react";
import { useColorMode } from "~/components/ui/color-mode";
import "@scalar/api-reference-react/style.css";
// import { getOrganizationApiKeys } from "~/lib/api-keys.server";
// import { userContext } from "~/middleware/auth";
import type { Route } from "../+types/root";
import { getUserFromSession } from "~/lib/session.server";
import { getOrganizationApiKeys } from "~/lib/api-keys.server";
import { useLoaderData } from "react-router";
import { getInstance } from "~/middleware/i18next";

const ApiReferenceReact = lazy(() =>
  import("@scalar/api-reference-react").then((m) => ({
    default: m.ApiReferenceReact,
  })),
);

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getUserFromSession(request);

  // Récupérer les clés d'API de l'organisation
  const apiKeys = user?.lastOrganizationId
    ? await getOrganizationApiKeys(user.lastOrganizationId)
    : null;

  const lastApiKeyValue = apiKeys?.[0]?.keyValue;

  const i18next = getInstance(context);
  return {
    lastApiKeyValue,
    title: i18next.t("page.api.title"),
    description: i18next.t("page.api.description"),
  };
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: data?.title ?? "API Reference — Transi-Store" },
    { name: "description", content: data?.description ?? "" },
  ];
}

export default function ApiDocPage() {
  const { colorMode } = useColorMode();
  const { lastApiKeyValue } = useLoaderData<typeof loader>();

  return (
    <Box minH="80vh">
      <Suspense
        fallback={
          <Box display="flex" justifyContent="center" py="20">
            <Spinner size="xl" />
          </Box>
        }
      >
        <ApiReferenceReact
          configuration={{
            url: "/api/doc.json",
            darkMode: colorMode === "dark",
            // forceDarkModeState: colorMode,
            hideDarkModeToggle: true,
            withDefaultFonts: false,
            showDeveloperTools: import.meta.env.DEV ? "always" : "never",
            hideClientButton: true,
            authentication: {
              preferredSecurityScheme: "BearerApiKey",
              securitySchemes: {
                // For API Key
                BearerApiKey: {
                  // name: "X-API-KEY",
                  in: "header",
                  token: lastApiKeyValue,
                },
              },
            },
          }}
        />
      </Suspense>
    </Box>
  );
}
