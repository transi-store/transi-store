---
name: update-database-schema
description: Update the Drizzle schema and server-side data access safely. Use this when asked to change stored data, relations, or multi-tenant persistence rules.
license: MIT
---

Use this workflow for schema and persistence changes:

1. Read `docs/technical-notes/README.md`.
2. Read `docs/technical-notes/database-schema.md`.
3. Read `docs/technical-notes/code-patterns.md`.
4. If the change affects protected data or auth-sensitive tables, also read `docs/technical-notes/authentication.md`.

Implementation checklist:

1. Update the Drizzle schema under `apps/website/drizzle/`.
2. Keep server-only data access in `apps/website/app/lib/**/*.server.ts`.
3. Preserve organization scoping and membership checks for protected data.
4. Reuse existing query and transaction patterns instead of creating parallel data-access styles.
5. If the schema change affects API contracts, update shared Zod schemas and OpenAPI registration.
6. If the feature is user-visible, update the relevant docs.

Validation checklist:

1. Run the repository type-check command.
2. Run the relevant tests for the changed flows.
3. If the local environment is available, apply the schema with the documented `db:push` workflow.
