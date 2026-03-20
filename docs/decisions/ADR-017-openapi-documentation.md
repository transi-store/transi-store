# ADR-017: Auto-generated OpenAPI documentation with Redoc

**Date**: 2026-03-20

**Status**: Accepted ✅

## Context

The REST API (endpoints `/export` and `/import`) had no public-facing documentation. Existing documentation was only in Markdown files under `docs/technical-notes/`, intended for project developers, not external integrators.

Several needs emerged:

- Provide interactive documentation for the API endpoints
- Precisely document parameters, formats, and error codes for integrators
- Reference the `@transi-store/cli` CLI tool as a simplified alternative
- Keep documentation synchronized with the code as it evolves

The main risk with manual documentation is **drift** between validation code and docs: if a parameter is added to a handler without updating the docs, nobody catches it.

## Decision

### 1. Zod schemas as the single source of truth

Zod schemas in `app/lib/api-doc/schemas/` serve two purposes simultaneously:

1. **Validating incoming requests** in handlers (via `safeParse()`)
2. **Auto-generating** the OpenAPI spec

This dual usage guarantees that documentation exactly reflects what the code validates. It is impossible to add a parameter to a schema without it appearing in the docs, or to document it without it being validated.

For multipart forms (`FormData`), validation of **text fields** (locale, strategy, format, branch) goes through Zod. The **file** is validated manually (presence, `File` type) because Zod cannot natively validate `File` objects.

### 2. OpenAPI generation with `@asteasolutions/zod-to-openapi`

The [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi) library extends Zod to allow enriching each field with OpenAPI metadata (description, example). A central registry collects the endpoints and generates the OpenAPI 3.1 document.

```typescript
// Zod schema enriched with OpenAPI metadata
export const exportQuerySchema = z.object({
  format: z.enum(["json", "xliff"]).default("json").openapi({
    description: "Output format.",
    example: "json",
  }),
  locale: z.string().openapi({
    description: "Language code to export.",
    example: "fr",
  }),
});

// Used in the handler (validation) AND in the registry (documentation)
const result = exportQuerySchema.safeParse({ ... });
```

### 3. Public routes

Two new public routes (no authentication required):

- `GET /api/doc` — HTML page with Redoc
- `GET /api/doc.json` — Raw OpenAPI 3.1 specification

### 4. Rendering with Redoc

[Redoc](https://github.com/Redocly/redoc) is loaded via **client-side lazy-loading** to avoid SSR issues. The page inherits the root layout and therefore displays the site header.

An "API" link is added to the header for unauthenticated users.

## Reasons

1. **Single source of truth**: Zod validates and documents simultaneously — out-of-sync documentation is impossible by design
2. **No duplication**: Schemas are defined once and reused everywhere
3. **Redoc**: High-quality interactive rendering, well-suited for OpenAPI 3.1
4. **OpenAPI 3.1**: Industry standard, compatible with many tools (clients, mocks, tests)
5. **Public accessibility**: Documentation is accessible without authentication, making integration easier

## Alternatives considered

### 1. Manual OpenAPI documentation (static YAML/JSON)

**Rejected**: High risk of divergence from the code. Any endpoint change requires a manual spec update, easily forgotten.

### 2. Auto-generation from JSDoc/TypeScript comments

**Rejected**: Less precise than explicit Zod schemas. TypeScript-based generation tools (`ts-json-schema-generator`, etc.) are more complex to integrate and less reliable for runtime types (enums, validation).

### 3. `swagger-jsdoc` + `swagger-ui-express`

**Rejected**: Requires annotating routes with JSDoc comments, which is verbose and still manual. `@asteasolutions/zod-to-openapi` is a better fit for our existing Zod stack.

### 4. Scalar instead of Redoc

**Considered**: Scalar is a more recent alternative to Redoc. Redoc was chosen because it is more mature, better documented, and has a stable React component (`RedocStandalone`). Scalar could be considered in the future.

## Consequences

### Positive

- Documentation always synchronized with validation code
- Interactive interface publicly accessible at `/api/doc`
- Explicit reference to the `@transi-store/cli` CLI in the docs
- Replicable pattern for any new API endpoint
- Indirect improvement of handlers (more explicit and consistent validation via Zod)

### Negative

- Additional dependencies: `@asteasolutions/zod-to-openapi`, `redoc` (+ `mobx`, `styled-components`, `core-js`)
- Redoc (~1.1 MB minified) increases the client bundle, mitigated by lazy-loading
- `File` fields (FormData) remain manually documented in the OpenAPI registry (technical limitation of Zod)

## Files created/modified

### Created

- `app/lib/api-doc/schemas/export.ts` — Zod schemas for the export endpoint
- `app/lib/api-doc/schemas/import.ts` — Zod schemas for the import endpoint
- `app/lib/api-doc/openapi.server.ts` — OpenAPI registry + document generation
- `app/routes/api.doc.json.tsx` — Route serving the JSON spec
- `app/routes/api.doc.tsx` — Route serving the Redoc page
- `docs/technical-notes/openapi-documentation.md` — Technical documentation

### Modified

- `app/routes.ts` — Two new public routes
- `app/routes/api.orgs.$orgSlug.projects.$projectSlug.export.tsx` — Uses `exportQuerySchema.safeParse()`
- `app/lib/import/process-import.server.ts` — Uses `importFieldsSchema.safeParse()`
- `app/components/Header/index.tsx` — "API" link in the header
- `app/locales/{en,fr,es}/translation.json` — `header.api` translation key added

## References

- [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi)
- [Redoc](https://github.com/Redocly/redoc)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [ADR-006](./ADR-006-cles-api-export.md) — API keys for export
- [ADR-014](./ADR-014-import-api-endpoint.md) — Import API endpoint
