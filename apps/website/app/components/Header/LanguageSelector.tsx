import { Button } from "@chakra-ui/react";
import { Menu, Portal } from "@chakra-ui/react";
import { Link, useLocation } from "react-router";
import { LuLanguages, LuCheck } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { DEFAULT_LANGUAGE_CODE, AVAILABLE_LANGUAGES } from "~/lib/i18n";
import {
  isLocalizablePublicPath,
  stripLocalePrefix,
} from "~/lib/localized-routes";

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const location = useLocation();

  const currentLang = i18n.language || DEFAULT_LANGUAGE_CODE;
  const { pathname: pathWithoutLocale } = stripLocalePrefix(location.pathname);
  const isPublicLocalizable = isLocalizablePublicPath(pathWithoutLocale);

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("languageSelector.label")}
        >
          <LuLanguages />{" "}
          {AVAILABLE_LANGUAGES.find((l) => l.code === currentLang)?.flag}
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {AVAILABLE_LANGUAGES.map((lang) => {
              let to: string;
              if (isPublicLocalizable) {
                // URL-prefixed locale: /pricing or /fr/pricing
                const prefix =
                  lang.code === DEFAULT_LANGUAGE_CODE ? "" : `/${lang.code}`;
                const path = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
                to = `${prefix}${path || "/"}${location.search}${location.hash}`;
              } else {
                // Legacy ?lng= behavior for non-localizable routes
                const params = new URLSearchParams(location.search);
                params.set("lng", lang.code);
                const search = params.toString();
                to = `${location.pathname}${search ? `?${search}` : ""}${location.hash}`;
              }

              return (
                <Menu.Item key={lang.code} value={lang.code} asChild>
                  <Link
                    to={to}
                    aria-current={
                      lang.code === currentLang ? "true" : undefined
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ marginRight: 8 }}>{lang.flag}</span>
                      {lang.name}
                    </span>
                    {lang.code === currentLang && <LuCheck />}
                  </Link>
                </Menu.Item>
              );
            })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
