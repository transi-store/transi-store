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
} from "~/middleware/i18next.server";
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE_CODE } from "~/lib/i18n";
import {
  isLocalizablePublicPath,
  stripLocalePrefix,
} from "~/lib/localized-routes";
import { queryCounterMiddleware } from "~/middleware/query-counter.server";
import { system } from "~/theme";
import { getUserFromSession } from "~/lib/session.server";
import { Header } from "~/components/Header";
import { Footer } from "~/components/Footer";
import { Toaster } from "~/components/ui/toaster";
import { useTranslation } from "react-i18next";
import { Analytics } from "@vercel/analytics/react";
import { ColorModeProvider } from "./components/ui/color-mode";
import "./fonts.css";

export const middleware = [queryCounterMiddleware, i18nextMiddleware];

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getUserFromSession(request);
  const locale = getLocale(context);

  const url = new URL(request.url);
  const { pathname: pathWithoutLocale } = stripLocalePrefix(url.pathname);
  const isPublicLocalizable = isLocalizablePublicPath(pathWithoutLocale);

  let hreflangLinks: Array<{ hrefLang: string; href: string }> = [];
  let canonicalHref: string;
  let xDefaultHref: string;

  if (isPublicLocalizable) {
    // SEO: prefix-based hreflangs for public localizable pages
    const buildLocaleUrl = (code: string) => {
      const prefix = code === DEFAULT_LANGUAGE_CODE ? "" : `/${code}`;
      const path = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
      return `${url.origin}${prefix}${path || "/"}`;
    };

    hreflangLinks = AVAILABLE_LANGUAGES.map((lang) => ({
      hrefLang: lang.code,
      href: buildLocaleUrl(lang.code),
    }));
    canonicalHref = buildLocaleUrl(locale);
    xDefaultHref = buildLocaleUrl(DEFAULT_LANGUAGE_CODE);
  } else {
    // Non-public/non-localizable routes: keep a simple canonical, no hreflang
    const baseParams = new URLSearchParams(url.searchParams);
    baseParams.delete("lng");
    const search = baseParams.size > 0 ? `?${baseParams.toString()}` : "";
    canonicalHref = `${url.origin}${url.pathname}${search}`;
    xDefaultHref = canonicalHref;
  }

  // Avoid rewriting the cookie on every navigation when it already matches
  const existingCookie = await localeCookie.parse(
    request.headers.get("Cookie"),
  );
  const headers =
    existingCookie === locale
      ? undefined
      : { "Set-Cookie": await localeCookie.serialize(locale) };

  return data(
    {
      user,
      locale,
      hreflangLinks,
      canonicalHref,
      xDefaultHref,
    },
    headers ? { headers } : undefined,
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
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="b20960d7-ca91-4a6b-b42e-91ad22b5c921"
        />
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
  const { user, locale, hreflangLinks, canonicalHref, xDefaultHref } =
    useLoaderData<typeof loader>();
  const { i18n, t } = useTranslation();

  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return (
    <Box minH="100vh" bg="surface.canvas" display="flex" flexDirection="column">
      {hreflangLinks.map(({ hrefLang, href }) => (
        <link key={hrefLang} rel="alternate" hrefLang={hrefLang} href={href} />
      ))}
      {hreflangLinks.length > 0 && (
        <link rel="alternate" hrefLang="x-default" href={xDefaultHref} />
      )}
      <link rel="canonical" href={canonicalHref} />

      <title>{t("website.title")}</title>
      <meta name="description" content={t("website.description")} />
      <Toaster />
      <Header user={user} />
      <Box as="main" flex="1">
        <Outlet />
      </Box>
      <Footer />
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
