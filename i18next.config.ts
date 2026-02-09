import { defineConfig } from "i18next-cli";
import { AVAILABLE_LANGUAGES } from "~/lib/i18n";

export default defineConfig({
  locales: AVAILABLE_LANGUAGES.map((lang) => lang.code),
  extract: {
    input: "app/**/*.{js,jsx,ts,tsx}",
    keySeparator: false, // Allow using nested keys with dots
    output: "app/locales/{{language}}/{{namespace}}.json",
  },
});
