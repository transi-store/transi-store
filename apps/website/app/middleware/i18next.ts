import { initReactI18next } from "react-i18next";
import { createCookie } from "react-router";
import { createI18nextMiddleware } from "remix-i18next/middleware";
import resources from "~/locales"; // Import your locales
import "i18next";
import ICU from "i18next-icu";
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE_CODE } from "~/lib/i18n";
import {
  isLocalizablePublicPath,
  stripLocalePrefix,
} from "~/lib/localized-routes";

// This cookie will be used to store the user locale preference
export const localeCookie = createCookie("lng", {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
});

export const [i18nextMiddleware, getLocale, getInstance] =
  createI18nextMiddleware({
    detection: {
      supportedLanguages: AVAILABLE_LANGUAGES.map((lang) => lang.code), // Your supported languages, the fallback should be last
      fallbackLanguage: DEFAULT_LANGUAGE_CODE, // Your fallback language
      cookie: localeCookie, // The cookie to store the user preference
      order: ["custom", "searchParams", "cookie", "header"],
      // Public localizable pages use the URL as the canonical source of truth:
      // - /fr/pricing → "fr"
      // - /pricing    → forced "en" (default), regardless of cookie/header
      // Non-localized routes (e.g. /orgs/...) return null so cookie/header detection
      // keeps working as before.
      async findLocale(request) {
        const pathname = new URL(request.url).pathname;
        const { locale, pathname: stripped } = stripLocalePrefix(pathname);
        if (locale) {
          return locale;
        }
        if (isLocalizablePublicPath(stripped)) {
          return DEFAULT_LANGUAGE_CODE;
        }
        return null;
      },
    },
    i18next: { resources }, // Your locales
    plugins: [initReactI18next, ICU], // Plugins you may need, like react-i18next
  });

// This adds type-safety to the `t` function
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: typeof resources.en; // Use `en` as source of truth for the types
  }
}
