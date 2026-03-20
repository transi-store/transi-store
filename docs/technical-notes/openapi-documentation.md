# OpenAPI Documentation

REST API documentation is automatically generated from **shared Zod schemas** via the [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi) library.

## Public URLs

| URL            | Description                                       |
| -------------- | ------------------------------------------------- |
| `/api/doc`     | HTML page with Redoc rendering + site header      |
| `/api/doc.json`| OpenAPI 3.1 specification (raw JSON)              |

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
└── api.doc.tsx             # Route serving the Redoc page
```

## Single Source of Truth

Zod schemas in `app/lib/api-doc/schemas/` are the **single source of truth**:

1. **OpenAPI generation**: Schemas are registered in the `@asteasolutions/zod-to-openapi` registry and automatically generate the OpenAPI spec.
2. **Handler validation**: The same schemas are used in API handlers to validate incoming requests via `safeParse()`.

This approach guarantees that documentation is always synchronized with validation code.

### Handlers Using Schemas

- **Export** (`app/routes/api.orgs.$orgSlug.projects.$projectSlug.export.tsx`): Uses `exportQuerySchema.safeParse()` to validate query params.
- **Import** (`app/lib/import/process-import.server.ts`): Uses `importFieldsSchema.safeParse()` to validate FormData text fields.

## Adding or Modifying an API Endpoint

When adding or modifying a documented API endpoint:

1. **Update the Zod schema** in `app/lib/api-doc/schemas/` (add fields, change types, etc.)
2. **Use the schema in the handler** for validation (`safeParse()`)
3. **Register the path in the OpenAPI registry** in `app/lib/api-doc/openapi.server.ts`
4. **Verify the rendering** on `/api/doc` after modification

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

## Redoc (Front-end)

HTML rendering uses [Redoc](https://github.com/Redocly/redoc), loaded via **client-side lazy-loading** to avoid SSR issues. The page inherits the root layout and displays the site header.

### Dependencies

- `redoc`: React component for rendering
- `mobx`, `styled-components`, `core-js`: Redoc peer dependencies
- `@asteasolutions/zod-to-openapi`: Spec generation from Zod

