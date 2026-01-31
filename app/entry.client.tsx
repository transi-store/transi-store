import Fetch from "i18next-fetch-backend";
import i18next from "i18next";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { HydratedRouter } from "react-router/dom";
import I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";
import ICU from "@jdeniau/i18next-icu";
import { DEFAULT_LANGUAGE_CODE } from "./lib/i18n";

async function main() {
  await i18next
    .use(initReactI18next)
    .use(ICU)
    .use(Fetch)
    .use(I18nextBrowserLanguageDetector)
    .init({
      fallbackLng: DEFAULT_LANGUAGE_CODE, // Change this to your default language
      // Here we only want to detect the language from the html tag
      // since the middleware already detected the language server-side
      detection: { order: ["htmlTag"], caches: [] },
      // Update this to the path where your locales will be served
      backend: { loadPath: "/api/locales/{{lng}}/{{ns}}" },
    });

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <HydratedRouter />
        </StrictMode>
      </I18nextProvider>,
    );
  });
}

main().catch((error) => console.error(error));
