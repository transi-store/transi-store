---
description: Guidance for server-only modules, Drizzle schema updates, and multi-tenant data access.
applyTo: "apps/website/drizzle/**/*.ts,apps/website/app/lib/**/*.server.ts"
---

Before changing server-side persistence code, read `docs/technical-notes/README.md`, then `docs/technical-notes/database-schema.md` and `docs/technical-notes/code-patterns.md`.

Use `*.server.ts` for code that must never reach the client: database access, auth logic, secrets, provider SDKs, and other server-only behavior.

All protected data is organization-scoped. Reuse the current organization or membership helpers instead of adding ad hoc tenant checks.

Keep database changes aligned with the Drizzle schema in `apps/website/drizzle/`. This repository uses `db:push` during development and does not keep migration files for routine changes.

Prefer existing query and transaction patterns already used in the repository over introducing new access layers or alternate ORM styles.
