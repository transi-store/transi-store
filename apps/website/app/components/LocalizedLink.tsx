import { Link, type LinkProps } from "react-router";
import { useTranslation } from "react-i18next";
import { DEFAULT_LANGUAGE_CODE } from "~/lib/i18n";
import { isLocalizablePublicPath } from "~/lib/localized-routes";

/**
 * Wraps `Link` from react-router and prepends the current locale prefix
 * (`/fr`, `/es`, `/de`) when the target is a localizable public path.
 *
 * Targets outside `LOCALIZABLE_PUBLIC_PATHS` (auth, /orgs/*, /api/*, …) and
 * external URLs are left untouched, so callers can use this everywhere
 * without thinking about which paths have a localized variant.
 */
export function LocalizedLink({ to, ...props }: LinkProps) {
  const { i18n } = useTranslation();

  if (typeof to !== "string" || !to.startsWith("/")) {
    return <Link to={to} {...props} />;
  }

  const pathname = to.split(/[?#]/, 1)[0];
  const currentLocale = i18n.language || DEFAULT_LANGUAGE_CODE;

  if (
    currentLocale === DEFAULT_LANGUAGE_CODE ||
    !isLocalizablePublicPath(pathname)
  ) {
    return <Link to={to} {...props} />;
  }

  const prefixedTo = `/${currentLocale}${to === "/" ? "" : to}`;
  return <Link to={prefixedTo} {...props} />;
}
