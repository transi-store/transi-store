# ADR-017: Auto-generated OpenAPI documentation with Scalar

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

Three new public routes (no authentication required):

- `GET /api/doc` — HTML page with site header + Scalar iframe
- `GET /api/doc/viewer` — Standalone HTML page serving Scalar via CDN (iframe target)
- `GET /api/doc.json` — Raw OpenAPI 3.1 specification

### 4. Rendering with Scalar

[Scalar](https://scalar.com/) is loaded via its **CDN** in a **standalone HTML page** (`/api/doc/viewer`). This page is embedded as an `<iframe>` in `/api/doc`, which keeps the root layout and site header.

The iframe approach is necessary because Scalar injects global CSS resets and variables that conflict with Chakra UI when rendered directly inside the React tree. Full CSS isolation via iframe resolves this cleanly.

The color mode (light/dark) is passed to the iframe as a `?theme=` query parameter, so Scalar stays in sync with the site's theme. No additional npm packages are needed for Scalar (CDN-only).

An "API" link is added to the header for unauthenticated users.

## Reasons

1. **Single source of truth**: Zod validates and documents simultaneously — out-of-sync documentation is impossible by design
2. **No duplication**: Schemas are defined once and reused everywhere
3. **Scalar**: Modern interactive rendering with "Try it out" built-in, lighter than Redoc (~350 KB vs ~1.1 MB), no npm dependency (CDN)
4. **CSS isolation**: Iframe approach avoids CSS conflicts between Scalar and Chakra UI
5. **OpenAPI 3.1**: Industry standard, compatible with many tools (clients, mocks, tests)
6. **Public accessibility**: Documentation is accessible without authentication, making integration easier

## Alternatives considered

### 1. Manual OpenAPI documentation (static YAML/JSON)

**Rejected**: High risk of divergence from the code. Any endpoint change requires a manual spec update, easily forgotten.

### 2. Auto-generation from JSDoc/TypeScript comments

**Rejected**: Less precise than explicit Zod schemas. TypeScript-based generation tools (`ts-json-schema-generator`, etc.) are more complex to integrate and less reliable for runtime types (enums, validation).

### 3. `swagger-jsdoc` + `swagger-ui-express`

**Rejected**: Requires annotating routes with JSDoc comments, which is verbose and still manual. `@asteasolutions/zod-to-openapi` is a better fit for our existing Zod stack.

### 4. Scalar instead of Redoc

**Chosen**: Scalar is a more modern alternative to Redoc. It was preferred over Redoc for its lighter bundle size (~350 KB vs ~1.1 MB), built-in "Try it out" feature (free, no paid plan required), and modern UI. Redoc was initially considered but Scalar was selected after comparison.

The main challenge was CSS isolation: Scalar's global styles conflict with Chakra UI. This was solved with the iframe approach (see decision §4 above).

## Consequences

### Positive

- Documentation always synchronized with validation code
- Interactive interface publicly accessible at `/api/doc`
- Built-in "Try it out" functionality via Scalar (no additional cost)
- Explicit reference to the `@transi-store/cli` CLI in the docs
- Replicable pattern for any new API endpoint
- Indirect improvement of handlers (more explicit and consistent validation via Zod)

### Negative

- Additional dependency: `@asteasolutions/zod-to-openapi`
- Scalar loaded via CDN (requires internet access in production — acceptable for a documentation page)
- `File` fields (FormData) remain manually documented in the OpenAPI registry (technical limitation of Zod)

## Files created/modified

### Created

- `app/lib/api-doc/schemas/export.ts` — Zod schemas for the export endpoint
- `app/lib/api-doc/schemas/import.ts` — Zod schemas for the import endpoint
- `app/lib/api-doc/openapi.server.ts` — OpenAPI registry + document generation
- `app/routes/api.doc.json.tsx` — Route serving the JSON spec
- `app/routes/api.doc.tsx` — Route serving the Scalar page (with site header + iframe)
- `app/routes/api.doc.viewer.tsx` — Standalone HTML page with Scalar CDN (iframe target)
- `docs/technical-notes/openapi-documentation.md` — Technical documentation

### Modified

- `app/routes.ts` — Two new public routes
- `app/routes/api.orgs.$orgSlug.projects.$projectSlug.export.tsx` — Uses `exportQuerySchema.safeParse()`
- `app/lib/import/process-import.server.ts` — Uses `importFieldsSchema.safeParse()`
- `app/components/Header/index.tsx` — "API" link in the header
- `app/locales/{en,fr,es}/translation.json` — `header.api` translation key added

## References

- [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi)
- [Scalar](https://scalar.com/)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [ADR-006](./ADR-006-cles-api-export.md) — API keys for export
- [ADR-014](./ADR-014-import-api-endpoint.md) — Import API endpoint
