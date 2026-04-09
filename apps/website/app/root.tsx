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
import { AVAILABLE_LANGUAGES } from "~/lib/i18n";
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

  const url = new URL(request.url);

  const baseParams = new URLSearchParams(url.searchParams);
  baseParams.delete("lng");
  const baseWithoutLng = `${url.origin}${url.pathname}${baseParams.size > 0 ? `?${baseParams.toString()}` : ""}`;

  const hreflangLinks = AVAILABLE_LANGUAGES.map((lang) => ({
    hrefLang: lang.code,
    href: `${baseWithoutLng}${baseParams.size > 0 ? "&" : "?"}lng=${lang.code}`,
  }));

  return data(
    { user, locale, hreflangLinks, defaultHref: baseWithoutLng },
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
  const { user, locale, hreflangLinks, defaultHref } =
    useLoaderData<typeof loader>();
  const { i18n, t } = useTranslation();

  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return (
    <Box
      minH="100vh"
      bg="surface.canvas"
      backgroundImage={{
        _light:
          "radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 32%), radial-gradient(circle at top right, rgba(221, 107, 32, 0.12), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.7), rgba(244,241,234,0.96)), repeating-linear-gradient(90deg, rgba(15,23,42,0.05) 0, rgba(15,23,42,0.05) 1px, transparent 1px, transparent 88px)",
        _dark:
          "radial-gradient(circle at top left, rgba(59, 130, 246, 0.22), transparent 30%), radial-gradient(circle at top right, rgba(221, 107, 32, 0.18), transparent 24%), linear-gradient(180deg, rgba(10,16,24,0.96), rgba(8,12,20,0.98)), repeating-linear-gradient(90deg, rgba(148,163,184,0.08) 0, rgba(148,163,184,0.08) 1px, transparent 1px, transparent 88px)",
      }}
      backgroundAttachment="fixed"
    >
      <title>{t("website.title")}</title>
      <meta name="description" content={t("website.description")} />

      {hreflangLinks.map(({ hrefLang, href }) => (
        <link key={hrefLang} rel="alternate" hrefLang={hrefLang} href={href} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={defaultHref} />

      <Toaster />
      <Header user={user} />
      <Box as="main" position="relative" zIndex={1}>
        <Outlet />
      </Box>
    </Box>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation();

  const message = t("error");
  let details = t("common.error");
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    details = error.statusText || details;
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
