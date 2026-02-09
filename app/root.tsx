import { useEffect, type ReactNode } from "react";
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import { ChakraProvider, Box, Alert, Container } from "@chakra-ui/react";
import {
  getLocale,
  i18nextMiddleware,
  localeCookie,
} from "~/middleware/i18next";
import { system } from "~/theme";
import { getUserFromSession } from "~/lib/session.server";
import { Header } from "~/components/Header";
import { Toaster } from "~/components/ui/toaster";
import { useTranslation } from "react-i18next";
import { ColorModeProvider } from "./components/ui/color-mode";

export const middleware = [i18nextMiddleware];

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getUserFromSession(request);
  const locale = getLocale(context);

  return data(
    { user, locale }, // Return the locale to the UI
    { headers: { "Set-Cookie": await localeCookie.serialize(locale) } },
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  return (
    <html lang={i18n.language} dir={i18n.dir(i18n.language)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicon pour thème light */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="/logo-square-black-bg.svg"
          media="(prefers-color-scheme: light)"
        />

        {/* Favicon pour thème dark */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="/logo-square-white-bg.svg"
          media="(prefers-color-scheme: dark)"
        />

        {/* Favicon par défaut (fallback) */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="/logo-square-black-bg.svg"
        />

        <Meta />
        <Links />
      </head>
      <body>
        <ChakraProvider value={system}>
          <ColorModeProvider>{children}</ColorModeProvider>
        </ChakraProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { user, locale } = useLoaderData<typeof loader>();
  const { i18n, t } = useTranslation();

  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return (
    <>
      <title>{t("website.title")}</title>
      <meta name="description" content={t("website.description")} />

      <Toaster />
      <Header user={user} />
      <Box as="main">
        <Outlet />
      </Box>
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? `The requested page could not be found.`
        : error.statusText || details;

    details += ` (status ${error.status})`;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    console.log(error);
    details = error.message;
    stack = error.stack;
  }

  return (
    <Container maxW="container.lg" py={10}>
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{message}</Alert.Title>
          <Alert.Description>
            {details}
            {stack && (
              <Box
                mt={4}
                p={4}
                bg="gray.100"
                borderRadius="md"
                overflow="auto"
                fontFamily="mono"
                fontSize="sm"
              >
                {stack}
              </Box>
            )}
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    </Container>
  );
}
