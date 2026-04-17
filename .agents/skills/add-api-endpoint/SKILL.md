---
name: add-api-endpoint
description: Add or modify a website API endpoint with the repository's auth, validation, and OpenAPI patterns. Use this for import, export, or organization-scoped APIs.
---

Use this workflow when creating or changing an API endpoint:

1. Read `docs/technical-notes/README.md`.
2. Read `docs/technical-notes/authentication.md`.
3. Read the API note that matches the feature:
   - `docs/technical-notes/export-api.md`
   - `docs/technical-notes/import-system.md`
4. Read `docs/technical-notes/openapi-documentation.md`.

Implementation checklist:

1. Put the route in the correct protected API layout under `apps/website/app/routes.ts`.
2. Reuse middleware-resolved organization context for organization-scoped endpoints.
3. Define or update the shared Zod schema in `apps/website/app/lib/api-doc/schemas/`.
4. Validate request input with that schema in the handler.
5. Register the endpoint in `apps/website/app/lib/api-doc/openapi.server.ts`.
6. Reuse existing format, import, and export services instead of duplicating parsing logic in the route.
7. If the endpoint is externally consumed, update user or developer documentation when the contract changes.

Validation checklist:

1. Run the repository type-check command.
2. Run endpoint-specific tests when available, otherwise run the main test suite.
