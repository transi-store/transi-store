# Import system

## Overview

The import system lets you bulk-load translations from JSON or XLIFF 2.0 files. It supports two strategies: overwrite existing translations or preserve them.

## Supported formats

### Flat JSON (key-value)

```json
{
  "home.title": "Accueil",
  "home.subtitle": "Bienvenue sur notre site",
  "navbar.about": "À propos",
  "navbar.contact": "Contact"
}
```

Constraints:

- Flat object (no nesting)
- Keys: strings (max 500 chars)
- Values: strings
- Max file size: **5 MB**

### XLIFF 2.0

The `<source>` element is treated as the **key name** (used to match translation keys), not as a translation value. The `<target>` element contains the translation.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" trgLang="fr">
  <file id="my-project">
    <unit id="home.title">
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
  </file>
</xliff>
```

## User interface

Route: `/orgs/:orgSlug/projects/:projectSlug/import-export`

The import form accepts a file (JSON or XLIFF, detected automatically from extension), a target locale, and an import strategy.

## Import strategies

### 1. Overwrite

- Creates new keys
- Updates existing translations
- Preserves translations not present in the file

**Example**:

```
Before:
  home.title (fr) = "Accueil"
  home.title (en) = "Home"
  navbar.about (fr) = "À propos"

Imported file (fr):
  home.title = "Page d'accueil"
  contact.email = "Email"

After:
  home.title (fr) = "Page d'accueil"  ← overwritten
  home.title (en) = "Home"            ← untouched (other locale)
  navbar.about (fr) = "À propos"      ← untouched (not in file)
  contact.email (fr) = "Email"        ← created
```

### 2. Skip

- Creates new keys
- **Ignores** existing translations (does not update them)

**Example**:

```
Before:
  home.title (fr) = "Accueil"

Imported file (fr):
  home.title = "Page d'accueil"
  contact.email = "Email"

After:
  home.title (fr) = "Accueil"     ← preserved (skip)
  contact.email (fr) = "Email"    ← created
```

## Import flow

### 1. Validation

- File size: max 5 MB
- Format detection: explicit `format` param, or inferred from file extension (`.json`, `.xliff`, `.xlf`)
- Parse file content
- Structure: flat object only (JSON), or valid XLIFF 2.0
- Keys: non-empty strings, max 500 chars
- Values: strings only

### 2. PostgreSQL transaction

All operations run in a single transaction:

1. For each key-value pair:
   - Upsert `translation_keys` (create or update `updatedAt`)
   - Insert or update `translations` based on strategy:
     - **overwrite**: `onConflictDoUpdate`
     - **skip**: `onConflictDoNothing`

### 3. Statistics

```json
{
  "success": true,
  "stats": {
    "total": 42,
    "keysCreated": 5,
    "translationsCreated": 8,
    "translationsUpdated": 3,
    "translationsSkipped": 0
  }
}
```

## Implementation

### Source files

- **API route**: `apps/website/app/routes/api.orgs.$orgSlug.projects.$projectSlug.import.tsx`
- **UI route**: `apps/website/app/routes/orgs.$orgSlug.projects.$projectSlug.import-export/index.tsx`
- **Zod schema** (validation + OpenAPI): `apps/website/app/lib/api-doc/schemas/import.ts`
- **Import orchestrator**: `apps/website/app/lib/import/process-import.server.ts`
- **Validation**: `apps/website/app/lib/import/validate-import-data.server.ts`
- **DB import logic**: `apps/website/app/lib/import/import-translations.server.ts`
- **Format classes**: `apps/website/app/lib/format/json-format.server.ts`, `apps/website/app/lib/format/xliff-format.server.ts`
- **Factory**: `apps/website/app/lib/format/format-factory.server.ts`

### Architecture

Text fields from `FormData` (locale, strategy, format, branch) are validated via the shared `importFieldsSchema` Zod schema (defined in `apps/website/app/lib/api-doc/schemas/import.ts`), which is also used to generate the OpenAPI documentation. The `file` field is validated manually (presence, `File` type check).

Format detection and parsing is delegated to the `TranslationFormat` interface via the factory:

```typescript
const translator = createTranslationFormat(format); // SupportedFormat enum
const parseResult = translator.parseImport(fileContent);
```

The validation and DB import steps are format-agnostic and live in their own files. See [`TranslationFormat` interface](#translationformat-interface) below.

### `TranslationFormat` interface

Defined in `apps/website/app/lib/format/types.ts`:

```typescript
export enum SupportedFormat {
  JSON = "json",
  XLIFF = "xliff",
}

export interface TranslationFormat {
  /** Parse file content into flat key→value pairs. */
  parseImport(fileContent: string): ParseResult;

  /** Export project translations for a single locale. */
  exportSingleLocale(
    projectTranslations: ProjectTranslations,
    options: ExportOptions,
  ): string;

  /**
   * Handle a full export request: validate URL params, export content,
   * and build the response filename and content-type.
   */
  handleExportRequest(params: ExportRequestParams): ExportRequestResult;
}
```

To add a new format, implement this interface, register it in the factory (`format-factory.server.ts`), and add the value to the `SupportedFormat` enum.

## Error handling

| Cause                        | Error message                                              |
| ---------------------------- | ---------------------------------------------------------- |
| Missing file field           | `"Missing 'file' field"`                                   |
| Missing locale field         | `"Missing 'locale' field"`                                 |
| Invalid strategy             | `"Invalid 'strategy' field. Use 'overwrite' or 'skip'"`    |
| Unknown file format          | `"Unsupported file format. Use JSON or XLIFF"`             |
| Parse error                  | Format-specific parse error message                        |
| Invalid data structure       | `"Invalid data"` + validation details                      |
| Locale not in project        | `"Language '{locale}' not found in this project"`          |
| DB error                     | `"Import failed"` + error details                          |

## Limitations

1. **File size**: 5 MB maximum
2. **JSON format**: flat objects only (no nesting)
3. **Types**: keys and values must be strings
4. **Key length**: 500 characters maximum
5. **Single locale**: one language per import

## Usage examples

### Via the API (cURL)

```bash
curl -X POST \
  -H "Authorization: Bearer <api-key>" \
  -F "locale=fr" \
  -F "strategy=overwrite" \
  -F "file=@translations.json" \
  "http://localhost:5173/api/orgs/my-org/projects/app/import"
```

### Via the CLI package

```bash
npx @transi-store/cli upload \
  -k <api-key> \
  -o my-org \
  -p app \
  -l fr \
  -I translations.json \
  -s overwrite
```

## References

- [OpenAPI documentation](./openapi-documentation.md) — How the API spec is generated from the Zod schemas
- [ADR-014](../decisions/ADR-014-import-api-endpoint.md) — Decision record for the import API endpoint
- [ADR-017](../decisions/ADR-017-openapi-documentation.md) — Decision record for the OpenAPI approach
- [XLIFF 2.0 Specification](https://docs.oasis-open.org/xliff/xliff-core/v2.0/xliff-core-v2.0.html)
