import type { RouteConfigEntry } from "@react-router/dev/routes";
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE_CODE } from "./i18n";

// Pathnames (without locale prefix) that have a localized version under /:lng/...
// Used to enforce URL-as-canonical on these paths and to gate hreflang/canonical generation.
const LOCALIZABLE_PUBLIC_PATHS: ReadonlyArray<string> = [
  "/",
  "/pricing",
  "/docs",
  "/docs/usage",
  "/docs/developer",
  "/auth/login",
];

const NON_DEFAULT_LOCALE_CODES: ReadonlyArray<string> = AVAILABLE_LANGUAGES.map(
  (lang) => lang.code,
).filter((code) => code !== DEFAULT_LANGUAGE_CODE);

const LOCALE_PREFIX_RE = new RegExp(
  `^/(${NON_DEFAULT_LOCALE_CODES.join("|")})(?=/|$)`,
);

export function stripLocalePrefix(pathname: string): {
  locale: string | null;
  pathname: string;
} {
  const match = LOCALE_PREFIX_RE.exec(pathname);
  if (!match) {
    return { locale: null, pathname };
  }
  const stripped = pathname.slice(match[0].length) || "/";

  return { locale: match[1], pathname: stripped };
}

export function isLocalizablePublicPath(pathname: string): boolean {
  return LOCALIZABLE_PUBLIC_PATHS.includes(pathname);
}

export function withLocalizedIds(
  routes: Array<RouteConfigEntry>,
  suffix = "localized",
): Array<RouteConfigEntry> {
  return routes.map((entry) => ({
    ...entry,
    id: entry.id ? `${entry.id}__${suffix}` : `${entry.file}__${suffix}`,
    children: entry.children
      ? withLocalizedIds(entry.children, suffix)
      : entry.children,
  }));
}
