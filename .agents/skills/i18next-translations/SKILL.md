---
name: i18next-translations
description: Add or modify i18next translations in the website app. Use this whenever you add or localize user-facing strings (UI labels, action error messages, route responses) so the translation keys stay type-safe and the four locale files stay in sync.
---

## Read first

- `docs/technical-notes/traductions.md` — how i18next is wired, where locale files live, naming convention.

## Core rule

Translation keys must always be **string literals** passed directly to `t(...)` / `i18next.t(...)`. i18next's TypeScript integration only type-checks literal keys — template literals, concatenation or runtime-built keys silently degrade to `string`, so typos are missed and knip / type-checks can't catch obsolete keys.

**Never** do this:

```ts
// BAD — builds a key at runtime, loses type safety
return t(`files.errors.path.${code}`);
```

Do this instead — branch in the function and pass literal keys:

```ts
// GOOD — each key is a literal, fully type-checked
if (!filePath.includes("<lang>")) {
  return t("files.errors.path.missingLangPlaceholder");
}
if (isAbsolute) {
  return t("files.errors.path.notRelative");
}
```

## Where translation happens

1. **Components (client)**: call `useTranslation()` inside the component and use the returned `t`.
2. **Loaders / actions (server)**: get the instance via `getInstance(context)` and call `i18next.t("key")`.
3. **Shared helpers that emit user-facing messages**: accept a `TFunction` (`import type { TFunction } from "i18next"`) argument and let the caller inject it. Don't hardcode English strings "to be translated later".

Example of a server-side helper that returns localized errors:

```ts
import type { TFunction } from "i18next";

export function validateOutputPath(
  filePath: string,
  t: TFunction,
): string | null {
  if (!filePath.includes("<lang>")) {
    return t("files.errors.path.missingLangPlaceholder");
  }
  return null;
}
```

Caller:

```ts
const i18next = getInstance(context);
const pathError = validateOutputPath(filePath, i18next.t);
```

## Interpolation syntax

This project uses **i18next-icu**, which means variable interpolation follows ICU format — **single braces**, not double:

```json
// CORRECT — single braces
"projects.updatedAt": "Updated {date}"

// WRONG — double braces (default i18next, not used here)
"projects.updatedAt": "Updated {{date}}"
```

Call site: `t("projects.updatedAt", { date: formattedDate })` — same as standard i18next, only the JSON syntax differs.

ICU also supports plurals and selects with the same single-brace format:

```json
"projects.keyCount": "{count, plural, one {# key} other {# keys}}"
```

## Locale files

- Live in `apps/website/app/locales/<lang>/translation.json` as a **flat** `"a.b.c": "value"` JSON file.
- `en` is the source of truth for the TypeScript key type (see `app/middleware/i18next.server.ts`). If a key exists in `fr` but not in `en`, it is not typed.
- When adding a key, add it in **all** locales in the same PR. Keep them alphabetically sorted — that's how the existing entries are maintained, and it makes diffs readable.
- Naming convention: `{namespace}.{group}.{key}`, e.g. `files.errors.path.notRelative`. Stay consistent with nearby entries.

## Before you commit

- Grep for any template-literal / concatenated key you may have introduced (`t(\`\`...\``)`, `t(` + variable, `"key.prefix." +`).
- Confirm `yarn lint:types` stays clean — strict i18next typing catches misspelled keys.
- Confirm all locale files contain the new keys (a missing key in `en` means the type is lost).
