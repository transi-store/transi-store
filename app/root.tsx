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
import { ChakraProvider, Box } from "@chakra-ui/react";
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
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return (
    <>
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
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>{message}</h1>
      <p>
        {details} (status {error.status})
      </p>
      {stack && (
        <pre
          style={{
            width: "100%",
            padding: "1rem",
            overflow: "auto",
            background: "#f5f5f5",
          }}
        >
          {stack}
        </pre>
      )}
    </main>
  );
}
