/**
 * Language selector rendered above each markdown editor. Lists the project's
 * configured languages and disables the locale already used by the other side
 * so the user always edits two distinct locales.
 */
import { NativeSelect } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

export type LanguagePickerProps = {
  value: string;
  onChange: (locale: string) => void;
  languages: ReadonlyArray<{ locale: string }>;
  disabledLocale?: string;
  ariaLabel?: string;
};

export function LanguagePicker({
  value,
  onChange,
  languages,
  disabledLocale,
  ariaLabel,
}: LanguagePickerProps) {
  const { t } = useTranslation();
  return (
    <NativeSelect.Root size="sm" maxW="200px">
      <NativeSelect.Field
        aria-label={ariaLabel ?? t("markdownTranslate.languagePicker.aria")}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        {languages.map((lang) => (
          <option
            key={lang.locale}
            value={lang.locale}
            disabled={lang.locale === disabledLocale}
          >
            {lang.locale}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
}
