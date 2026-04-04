# Export API

## Overview

The export API lets you download project translations in several formats: JSON, XLIFF 2.0, YAML, CSV, Gettext PO, INI, and PHP. It supports two authentication methods: user session or API key.

## Endpoint

```
GET /api/orgs/:orgSlug/projects/:projectSlug/translations
```

**Example**:

```
GET /api/orgs/mapado/projects/website/translations?format=json&locale=fr
```

## Authentication

### 1. User session (cookie)

Standard session-cookie authentication:

```bash
curl -b cookies.txt \
  "http://localhost:5173/api/orgs/my-org/projects/app/translations?format=json&locale=fr"
```

The `session` cookie must be present and valid.

### 2. API key (Bearer token)

Programmatic authentication via the `Authorization` header:

```bash
curl -H "Authorization: Bearer <api-key>" \
  "http://localhost:5173/api/orgs/my-org/projects/app/translations?format=json&locale=fr"
```

Benefits:

- Ideal for CI/CD pipelines
- No need to maintain a session
- Usage tracking via `last_used_at`

Creating a key: via the web UI at `/orgs/:orgSlug/settings` (API Keys section). Generated as `base64url(crypto.randomBytes(24))` → 32 characters.

## Query parameters

| Parameter | Values                               | Required | Description                                                 |
| --------- | ------------------------------------ | -------- | ----------------------------------------------------------- |
| `format`  | json, xliff, yaml, csv, po, ini, php | Yes      | Output format                                               |
| `locale`  | string                               | Yes      | Language code (e.g. `fr`, `en`)                             |
| `branch`  | string                               | No       | Branch slug (defaults to main). Use `@all` for all branches |

## JSON format

**Example**:

```bash
GET /api/orgs/my-org/projects/app/translations?format=json&locale=fr
```

**Response**:

```json
{
  "home.title": "Accueil",
  "home.subtitle": "Bienvenue sur notre site",
  "navbar.about": "À propos",
  "navbar.contact": "Contact"
}
```

## XLIFF 2.0 format

**Example**:

```bash
GET /api/orgs/my-org/projects/app/translations?format=xliff&locale=fr
```

**Response**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" trgLang="fr">
  <file id="my-project">
    <unit id="home.title">
      <notes>
        <note>Welcome message on homepage</note>
      </notes>
      <segment>
        <source>home.title</source>
        <target>Accueil</target>
      </segment>
    </unit>
    <unit id="navbar.about">
      <segment>
        <source>navbar.about</source>
        <target>À propos</target>
      </segment>
    </unit>
  </file>
</xliff>
```

Notes:

- `<source>` contains the **key name** (not a translation in a source language)
- Key descriptions are exported as `<notes>`
- XML special characters are automatically escaped
- The `<xliff>` root only has `trgLang` (no `srcLang`)

## YAML format

**Example**:

```bash
GET /api/orgs/my-org/projects/app/translations?format=yaml&locale=fr
```

**Response**:

```yaml
home.title: Accueil
home.subtitle: Bienvenue sur notre site
navbar.about: À propos
navbar.contact: Contact
```

Notes:

- Flat key-value format (keys are not nested)
- On import, nested YAML structures are automatically flattened with dot-separated keys

## CSV format

**Example**:

```bash
GET /api/orgs/my-org/projects/app/translations?format=csv&locale=fr
```

**Response**:

```csv
home.title,Accueil
home.subtitle,Bienvenue sur notre site
navbar.about,À propos
navbar.contact,Contact
```

Notes:

- Two columns: key, value (no header row)
- Values containing commas, quotes, or newlines are properly quoted (RFC 4180)

## Gettext PO format

**Example**:

```bash
GET /api/orgs/my-org/projects/app/translations?format=po&locale=fr
```

**Response**:

```po
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\n"
"Content-Transfer-Encoding: 8bit\n"
"Language: fr\n"

msgid "home.title"
msgstr "Accueil"

msgid "navbar.about"
msgstr "À propos"
```

Notes:

- Standard Gettext PO format, compatible with Symfony and other tools
- Header entry includes charset and language metadata
- Special characters (quotes, newlines, backslashes) are properly escaped

## INI format

**Example**:

```bash
GET /api/orgs/my-org/projects/app/translations?format=ini&locale=fr
```

**Response**:

```ini
home.title=Accueil
home.subtitle=Bienvenue sur notre site
navbar.about=À propos
navbar.contact=Contact
```

Notes:

- Simple `key=value` format
- Values with special characters (quotes, equals, semicolons) are automatically quoted
- On import, comments (`;`, `#`) and section headers (`[section]`) are ignored

## PHP format

**Example**:

```bash
GET /api/orgs/my-org/projects/app/translations?format=php&locale=fr
```

**Response**:

```php
<?php

return [
    'home.title' => 'Accueil',
    'home.subtitle' => 'Bienvenue sur notre site',
    'navbar.about' => 'À propos',
    'navbar.contact' => 'Contact',
];
```

Notes:

- Standard Symfony translation array format
- On import, both single-quoted and double-quoted strings are supported
- Single quotes in values are properly escaped with backslash

## Response headers

### JSON

```http
Content-Type: application/json; charset=utf-8
Content-Disposition: attachment; filename="project-slug-fr.json"
```

### XLIFF

```http
Content-Type: application/x-xliff+xml; charset=utf-8
Content-Disposition: attachment; filename="project-slug-fr.xliff"
```

### YAML

```http
Content-Type: text/yaml; charset=utf-8
Content-Disposition: attachment; filename="project-slug-fr.yaml"
```

### CSV

```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="project-slug-fr.csv"
```

### Gettext PO

```http
Content-Type: text/x-gettext-translation; charset=utf-8
Content-Disposition: attachment; filename="project-slug-fr.po"
```

### INI

```http
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="project-slug-fr.ini"
```

### PHP

```http
Content-Type: text/x-php; charset=utf-8
Content-Disposition: attachment; filename="project-slug-fr.php"
```

## Error handling

| Status | Cause                                                          |
| ------ | -------------------------------------------------------------- |
| 400    | Missing/invalid parameters, unsupported format, unknown locale |
| 401    | No valid session or API key                                    |
| 403    | User is not a member of the organization                       |
| 404    | Project not found                                              |

## Implementation

### Source files

- **Route**: `apps/website/app/routes/api.orgs.$orgSlug.projects.$projectSlug.translations.tsx`
- **Zod schema** (validation + OpenAPI): `apps/website/app/lib/api-doc/schemas/export.ts`
- **Format classes**: `apps/website/app/lib/format/json-format.server.ts`, `apps/website/app/lib/format/xliff-format.server.ts`, `apps/website/app/lib/format/yaml-format.server.ts`, `apps/website/app/lib/format/csv-format.server.ts`, `apps/website/app/lib/format/po-format.server.ts`, `apps/website/app/lib/format/ini-format.server.ts`, `apps/website/app/lib/format/php-format.server.ts`
- **Factory**: `apps/website/app/lib/format/format-factory.server.ts`
- **Types/interface**: `apps/website/app/lib/format/types.ts`

### Architecture

Query parameters are validated via the shared `exportQuerySchema` Zod schema (defined in `apps/website/app/lib/api-doc/schemas/export.ts`), which is also used to generate the OpenAPI documentation. This ensures validation and documentation are always in sync.

The export route is format-agnostic. It delegates entirely to the `TranslationFormat` interface via the factory:

```typescript
const format = createTranslationFormat(formatName); // SupportedFormat enum
const result = format.handleExportRequest({
  searchParams,
  projectTranslations,
  projectName,
  availableLocales,
});
```

Each format class (`JsonTranslationFormat`, `XliffTranslationFormat`, `YamlTranslationFormat`, `CsvTranslationFormat`, `PoTranslationFormat`, `IniTranslationFormat`, `PhpTranslationFormat`) handles its own parameter validation, content generation, filename, and content-type. See [import-system.md](./import-system.md) for the full interface description.

### API key tracking

The `last_used_at` field is updated on every call (asynchronous, non-blocking).

## Integration examples

### CI/CD (GitHub Actions)

```yaml
- name: Download translations
  run: |
    curl -H "Authorization: Bearer ${{ secrets.TRANSI_STORE_API_KEY }}" \
      -o translations.json \
      "https://transi-store.com/api/orgs/my-org/projects/app/translations?format=json&locale=fr"
```

### Node.js script

```javascript
async function downloadTranslations(locale) {
  const response = await fetch(
    `https://transi-store.com/api/orgs/my-org/projects/app/translations?format=json&locale=${locale}`,
    { headers: { Authorization: `Bearer ${process.env.API_KEY}` } },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

## References

- [XLIFF 2.0 Specification](http://docs.oasis-open.org/xliff/xliff-core/v2.0/xliff-core-v2.0.html)
- [RFC 6750 - Bearer Token](https://datatracker.ietf.org/doc/html/rfc6750)
- [OpenAPI documentation](./openapi-documentation.md) — How the API spec is generated from the Zod schemas
- [ADR-017](../decisions/ADR-017-openapi-documentation.md) — Decision record for the OpenAPI approach
