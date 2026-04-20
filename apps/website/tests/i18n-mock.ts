import en from "../app/locales/en/translation.json";

// Minimal i18next fake for unit tests. Loads the English resources (which are
// the source of truth for the type system) and interpolates ICU-style
// `{varName}` placeholders. Good enough to assert on the final error strings
// without booting the real middleware.
function createI18nextMock() {
  return {
    t(key: string, vars?: Record<string, unknown>): string {
      const template = (en as Record<string, string>)[key] ?? key;

      if (!vars) {
        return template;
      }

      return template.replace(/\{(\w+)\}/g, (_, name: string) =>
        name in vars ? String(vars[name]) : `{${name}}`,
      );
    },
  };
}

// Drop-in replacement for the `~/middleware/i18next` module in vitest:
//
//   vi.mock("~/middleware/i18next", () => i18nextModuleMock);
export const i18nextModuleMock = {
  getInstance: () => createI18nextMock(),
};
