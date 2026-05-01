---
description: Guidance for API routes, import/export flows, validation, and OpenAPI updates.
applyTo: "apps/website/app/routes/api*.ts,apps/website/app/routes/api*.tsx,apps/website/app/lib/api-doc/**/*.ts,apps/website/app/lib/import/**/*.ts,apps/website/app/lib/import/**/*.tsx,apps/website/app/lib/format/**/*.ts,apps/website/app/lib/format/**/*.tsx"
---

Before changing API surfaces, read `docs/technical-notes/README.md`, then open the relevant notes in `docs/technical-notes/export-api.md`, `docs/technical-notes/import-system.md`, `docs/technical-notes/openapi-documentation.md`, and `docs/technical-notes/authentication.md`.

API authentication is middleware-based. Under `api/orgs/:orgSlug`, use the organization already resolved by `orgContext` instead of repeating membership lookups in every handler.

When adding or changing an endpoint:

1. Update or add the shared Zod schema in `apps/website/app/lib/api-doc/schemas/`.
2. Use that schema in the handler with explicit validation such as `safeParse()`.
3. Register the endpoint in `apps/website/app/lib/api-doc/openapi.server.ts`.

Prefer reusing the existing import/export and format services instead of duplicating request parsing or translation-format logic inside route handlers.

Every endpoint change must come with tests. Add cases for the success path, the new error branches (400/404/etc.), and any cross-cutting rules such as auth or organization scoping. Loader/action tests live next to the route file (e.g. `*.translations.export.test.ts`); helper functions get their own `*.server.test.ts` next to the implementation.
