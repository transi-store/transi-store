import { useEffect, type ReactNode } from "react";
import {
  data,
  isRouteErrorResponse,
  Links,
  Link,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import {
  ChakraProvider,
  Box,
  Alert,
  Container,
  Heading,
  Text,
  Button,
  VStack,
} from "@chakra-ui/react";
import {
  getLocale,
  i18nextMiddleware,
  localeCookie,
} from "~/middleware/i18next";
import { queryCounterMiddleware } from "~/middleware/query-counter";
import { system } from "~/theme";
import { getUserFromSession } from "~/lib/session.server";
import { Header } from "~/components/Header";
import { Toaster } from "~/components/ui/toaster";
import { useTranslation } from "react-i18next";
import { Analytics } from "@vercel/analytics/react";
import { ColorModeProvider } from "./components/ui/color-mode";

export const middleware = [queryCounterMiddleware, i18nextMiddleware];

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
        <Analytics />
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
  const { t } = useTranslation();
  const rootData = useRouteLoaderData<typeof loader>("root");
  const user = rootData?.user ?? null;

  const is404 = isRouteErrorResponse(error) && error.status === 404;

  let details: string | undefined;
  let stack: string | undefined;

  if (!is404) {
    if (isRouteErrorResponse(error)) {
      details = error.statusText || t("common.error");
      details += ` (status ${error.status})`;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
      console.log(error);
      details = error.message;
      stack = error.stack;
    } else {
      details = t("common.error");
    }
  }

  return (
    <>
      <Toaster />
      <Header user={user} />
      <Box as="main">
        {is404 ? (
          <Container maxW="container.lg" py={20}>
            <VStack gap={6} textAlign="center">
              <Heading
                fontSize={{ base: "8xl", md: "9xl" }}
                fontWeight="bold"
                color="accent.solid"
                lineHeight={1}
              >
                404
              </Heading>
              <Heading size="2xl" fontWeight="semibold">
                {t("notFound.title")}
              </Heading>
              <Text color="fg.muted" fontSize="lg" maxW="md">
                {t("notFound.description")}
              </Text>
              <Button asChild size="lg" mt={4}>
                <Link to="/">{t("notFound.backHome")}</Link>
              </Button>
            </VStack>
          </Container>
        ) : (
          <Container maxW="container.lg" py={10}>
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{t("error")}</Alert.Title>
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
        )}
      </Box>
    </>
  );
}
