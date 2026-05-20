# OpenAPI Documentation

REST API documentation is automatically generated from **shared Zod schemas** via the [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi) library.

## Public URLs

| URL               | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `/api/doc`        | HTML page with Scalar rendering + site header        |
| `/api/doc/viewer` | Standalone HTML page with Scalar CDN (iframe target) |
| `/api/doc.json`   | OpenAPI 3.1 specification (raw JSON)                 |

These routes are public (no authentication required).

## Architecture

```
app/lib/api-doc/
├── schemas/
│   ├── export.ts           # Zod schemas for the export endpoint
│   └── import.ts           # Zod schemas for the import endpoint
└── openapi.server.ts       # OpenAPI registry + document generation

app/routes/
├── api.doc.json.tsx        # Route serving the JSON spec
├── api.doc.tsx             # Route serving the Scalar page (with site header)
└── api.doc.viewer.tsx      # Standalone HTML page with Scalar CDN (iframe target)
```

## Single Source of Truth

Zod schemas in `apps/website/app/lib/api-doc/schemas/` are the **single source of truth**:

1. **OpenAPI generation**: Schemas are registered in the `@asteasolutions/zod-to-openapi` registry and automatically generate the OpenAPI spec.
2. **Handler validation**: The same schemas are used in API handlers to validate incoming requests via `safeParse()`.

This approach guarantees that documentation is always synchronized with validation code.

## Shared Schemas (ALWAYS use `packages/common`)

API request and response schemas **MUST** live in `packages/common` and be reused by every consumer (API handlers, OpenAPI registry, `@transi-store/cli`, future SDKs). Never declare a duplicate local TypeScript type or Zod schema in a consumer — drift between the API and its clients is the failure mode this rule exists to prevent.

### The factory pattern

Schemas in `packages/common` are exposed as **factory functions** (`createFooSchema()`), not pre-built instances. This is required because `extendZodWithOpenApi(z)` patches `ZodType.prototype` and only affects schemas instantiated **after** the patch runs. If `common` exported a pre-built schema, the API side could not add `.openapi()` metadata to it.

```typescript
// packages/common/src/foo-schema.ts
import z from "zod";

export function createFooResponseSchema() {
  return z.object({
    success: z.literal(true),
    count: z.number().int().describe("Number of items processed."),
  });
}

export type FooResponse = z.infer<ReturnType<typeof createFooResponseSchema>>;
```

### The API side enriches with `.openapi()`

```typescript
// apps/website/app/lib/api-doc/schemas/foo.ts
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createFooResponseSchema } from "@transi-store/common";

extendZodWithOpenApi(z);

export const fooResponseSchema = createFooResponseSchema()
  .extend({
    count: z.number().int().openapi({
      description: "Number of items processed.",
      example: 42,
    }),
  })
  .openapi("FooResponse");
```

### Consumers (CLI, SDKs) validate with `safeParse()`

Consumers import the **plain** factory from `@transi-store/common` (not the OpenAPI-enriched version) and validate API responses at runtime. No more local TS casts, no defensive `?? 0` fallbacks for fields the contract says are required.

```typescript
import { createFooResponseSchema } from "@transi-store/common";

const fooResponseSchema = createFooResponseSchema();
const parsed = fooResponseSchema.safeParse(await response.json());
if (!parsed.success) {
  return { ok: false, error: `Unexpected response: ${parsed.error.message}` };
}
```

### Existing shared schemas (examples to follow)

- `createProjectFileSchema`, `createProjectLanguageSchema`, `createProjectDetailSchema` — project detail endpoint
- `createBranchMergeSuccessResponseSchema`, `createBranchMergeErrorResponseSchema` — branch merge endpoint
- `configSchema` — CLI config file (used by CLI + JSON Schema generator)

### Handlers Using Schemas

- **Export** (`apps/website/app/routes/api.orgs.$orgSlug.projects.$projectSlug.export.tsx`): Uses `exportQuerySchema.safeParse()` to validate query params.
- **Import** (`apps/website/app/lib/import/process-import.server.ts`): Uses `importFieldsSchema.safeParse()` to validate FormData text fields.

## Adding or Modifying an API Endpoint

When adding or modifying a documented API endpoint:

1. **Declare the schema factory in `packages/common/src/`** and export it from `packages/common/src/index.ts`.
2. **Build the OpenAPI-enriched schema** in `apps/website/app/lib/api-doc/schemas/` by calling the factory and adding `.openapi()` metadata.
3. **Use the schema in the handler** for validation (`safeParse()`).
4. **Register the path in the OpenAPI registry** in `apps/website/app/lib/api-doc/openapi.server.ts`.
5. **Reuse the common factory in every external consumer** (CLI, SDKs) to validate responses — never re-declare the shape.
6. **Verify the rendering** on `/api/doc` after modification.

### Example: Adding a Query Parameter to Export

```typescript
// 1. Modify the schema (app/lib/api-doc/schemas/export.ts)
export const exportQuerySchema = z.object({
  format: z.enum(["json", "xliff"]).default("json").openapi({ ... }),
  locale: z.string().openapi({ ... }),
  branch: z.string().optional().openapi({ ... }),
  newParam: z.string().optional().openapi({ description: "My new parameter" }),
});

// 2. Handler already uses safeParse() → validation is automatic
// 3. OpenAPI registry already uses this schema → documentation is automatic
```

## Scalar (Front-end)

HTML rendering uses [Scalar](https://scalar.com/), loaded via its **CDN** (`cdn.jsdelivr.net/npm/@scalar/api-reference`) in a **standalone HTML page** (`/api/doc/viewer`). This page is embedded in an `<iframe>` inside `/api/doc`, which keeps the site header from the root layout.

### Why the iframe approach?

Scalar injects global CSS resets and variables that conflict with Chakra UI when rendered directly inside the React root. The iframe provides full CSS isolation while preserving the site header.

The color mode (light/dark) is passed as a `?theme=` query parameter from the parent page to the iframe, so Scalar stays in sync with the site's color mode.

### Dependencies

- `@asteasolutions/zod-to-openapi`: Spec generation from Zod
- No npm dependency for Scalar itself: loaded via CDN
