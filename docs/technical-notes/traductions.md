# Translation management

This technical note describes how translations are managed in transi-store using i18next.

## Translation file structure

Translation files are stored in `apps/website/app/locales/{lang}/{namespace}.json`, where `{lang}` is the language code (e.g. `en`, `fr`) and `{namespace}` is the namespace name (e.g. `common`, `dashboard`).

Each JSON file contains key-value pairs representing translated strings. For example:

```json
{
  "home.welcome_message": "Welcome to transi-store",
  "auth.logout": "Log out"
}
```

## i18next configuration

We use i18next and react-i18next for translation management.

No new text should be written directly in React components. All strings must be added to the appropriate translation files and used via the `useTranslation` hook + a translation key.
The translation key must follow the `{namespace}.{key}` or `{namespace}.{context}.{key}` convention for clear organization.
