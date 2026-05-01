import { lazy, Suspense } from "react";
import { Box, Spinner } from "@chakra-ui/react";
import { useColorMode } from "~/components/ui/color-mode";
import { getUserFromSession } from "~/lib/session.server";
import { getOrganizationApiKeys } from "~/lib/api-keys.server";
import { useLoaderData } from "react-router";
import type { Route } from "./+types/api.doc";
import { useTranslation } from "react-i18next";
import "@scalar/api-reference-react/style.css";

const ApiReferenceReact = lazy(() =>
  import("@scalar/api-reference-react").then((m) => ({
    default: m.ApiReferenceReact,
  })),
);

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUserFromSession(request);

  // Retrieve the organization's API keys
  const apiKeys = user?.lastOrganizationId
    ? await getOrganizationApiKeys(user.lastOrganizationId)
    : null;

  const lastApiKeyValue = apiKeys?.[0]?.keyValue;

  return { lastApiKeyValue };
}

export default function ApiDocPage() {
  const { colorMode } = useColorMode();
  const { lastApiKeyValue } = useLoaderData<typeof loader>();
  const { t } = useTranslation();

  return (
    <Box minH="80vh">
      <title>{t("page.api.title")}</title>
      <meta name="description" content={t("page.api.description")} />
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
