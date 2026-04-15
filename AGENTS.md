# AGENTS.md

This file provides guidance to AI coding agents (GitHub Copilot, OpenAI Codex, Cursor, Claude, etc.) when working with code in this repository.

## Project overview

transi-store is an open-source translation management platform — a self-hosted alternative to Phrase, Crowdin, and Transifex. It is a **Yarn Berry v4 monorepo** with the following workspaces:

- `apps/website` — Main web application (React Router v7 SSR, full-stack)
- `packages/common` — Shared types and utilities
- `packages/cli` — CLI tool (`@transi-store/cli`) for syncing translations

Tooling (ESLint, Prettier, Knip, lint-staged, Husky) is configured at the **root** level.

## Development environment

The application runs entirely inside **Docker**. Node.js/Yarn are NOT required on the host machine.

### First-time setup

```bash
cp .env.example .env   # configure OAuth credentials and secrets (see .env.example)
make setup             # starts Docker, installs deps, creates DB schema
make dev               # starts dev server at http://localhost:5173
```

### Common commands

```bash
make dev               # start dev server (http://localhost:5173)
make build             # production build
make test              # run tests (Vitest)
make lint-types        # TypeScript type-check (yarn lint:types)
make knip              # find unused code/deps
make shell             # open a shell in the app container
make db-push           # apply schema changes to PostgreSQL
make db-studio         # open Drizzle Studio GUI
make db-reset          # ⚠️  wipe and recreate the database
make up / down         # start/stop Docker containers
make logs              # tail Docker logs
```

### Without Make

```bash
docker compose exec app yarn dev
docker compose exec app yarn build
docker compose exec app yarn test --run
docker compose exec app yarn lint:types
docker compose exec app yarn db:push
```

## Documentation structure

**Always read relevant docs before making changes.** All technical notes are in `docs/technical-notes/`:

- [`architecture.md`](./docs/technical-notes/architecture.md) — System architecture overview
- [`routing.md`](./docs/technical-notes/routing.md) — React Router v7 route configuration
- [`authentication.md`](./docs/technical-notes/authentication.md) — OAuth2/OIDC flow with PKCE
- [`database-schema.md`](./docs/technical-notes/database-schema.md) — PostgreSQL schema and relationships
- [`export-api.md`](./docs/technical-notes/export-api.md) — Translation export API (JSON/XLIFF)
- [`import-system.md`](./docs/technical-notes/import-system.md) — Translation import system
- [`openapi-documentation.md`](./docs/technical-notes/openapi-documentation.md) — OpenAPI spec generation and Redoc UI
- [`code-patterns.md`](./docs/technical-notes/code-patterns.md) — Coding patterns used throughout the codebase
- [`code-formatting.md`](./docs/technical-notes/code-formatting.md) — Prettier formatting rules
- [`traductions.md`](./docs/technical-notes/traductions.md) — i18n translation management
- [`dev-setup-and-testing.md`](./docs/technical-notes/dev-setup-and-testing.md) — Testing setup (Vitest + PGlite)

Architecture Decision Records: [`docs/decisions/`](./docs/decisions/)

## Tech stack

- **Framework**: React Router v7 (SSR framework mode)
- **UI**: Chakra UI v3 + React 19
- **Database**: PostgreSQL 18 + Drizzle ORM v1.0.0-beta
- **Auth**: OAuth2/OIDC via Arctic (Google, GitHub, Mapado providers)
- **Package Manager**: Yarn Berry v4
- **Testing**: Vitest + PGlite (in-memory PostgreSQL)

## Critical patterns

### 1. Routes — manual configuration required

Routes are manually configured in `apps/website/app/routes.ts` (NOT file-based discovery). Adding a new route requires **both** creating the file AND declaring it in `routes.ts`.

### 2. Server-only code

Use `.server.ts` suffix for files that must never reach the client:

- Database queries, auth logic, secrets

### 3. Authentication — middleware-based

Auth is handled by middleware, not per-loader calls.

- **App routes** (under `app-layout.tsx`): session auth middleware redirects to login if unauthenticated
- **API routes** (under `api-layout.tsx` → `api-org-layout.tsx`): dual auth (Bearer API key or session), returns 403 JSON on failure

```typescript
// App routes — get the authenticated user
import { userContext } from "~/middleware/auth";
const user = context.get(userContext);
const org = await requireOrganizationMembership(user, params.orgSlug);

// API routes — org is already resolved by middleware
import { orgContext } from "~/middleware/api-auth";
const organization = context.get(orgContext);
```

### 4. Route hierarchy for new routes

- Authenticated app pages → add inside `layout("routes/app-layout.tsx", [...])` in `apps/website/app/routes.ts`
- Authenticated API routes under `api/orgs/:orgSlug/...` → add inside the `route("api/orgs/:orgSlug", "routes/api-org-layout.tsx", [...])` block
- Public routes → add outside any layout

### 5. Database changes

Use `yarn db:push` (no migration files — schema is pushed directly during development).

### 6. Multi-tenant

All data is isolated by organisation. All protected operations call `requireOrganizationMembership()`.

### 7. API documentation (OpenAPI)

The API spec is auto-generated from **shared Zod schemas** in `apps/website/app/lib/api-doc/schemas/`. When adding or modifying an API endpoint:

1. Update the Zod schema in the corresponding schema file
2. Use the schema in the handler for validation (`safeParse()`)
3. Register the path in `apps/website/app/lib/api-doc/openapi.server.ts`

### 8. User-facing documentation pages

Documentation pages live in `apps/website/app/docs/` as **MDX files**. When adding or significantly changing a feature:

1. Update the relevant MDX file (`usage.mdx` for end-user features, `developer.mdx` for self-hosting/infrastructure changes).
2. If a new UI mockup is needed, add a component in `apps/website/app/components/docs/ui-mockups/`.
3. Update the sidebar nav in `apps/website/app/components/docs/DocLayout.tsx` if a new section is added.
4. See `docs/technical-notes/docs-pages.md` for the full documentation maintenance guide.

## Environment variables

Required in `.env` (at monorepo root). See `.env.example` for all options.

```bash
# Session & encryption
SESSION_SECRET=a-long-random-string
ENCRYPTION_KEY=64-char-hex-key

# At least one OAuth provider must be configured
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

The `DATABASE_URL` is pre-configured for the Docker Compose setup and does not need to change in development.

## Key rules when contributing

1. **Always read the relevant technical-notes** before implementing features
2. **Follow existing patterns** documented in `code-patterns.md`
3. **Check ADRs** for context on past decisions
4. **Verify route configuration** in `apps/website/app/routes.ts` when adding routes
5. **Run `make lint-types` and `make knip`** before committing
6. **Website code lives in `apps/website/`** — don't create app files at the monorepo root

---

**For detailed implementation guidance, always refer to the `docs/technical-notes/` folder.**

### Handling changesets

This packages uses [Changesets](https://github.com/changesets/changesets) to handle versions and changelogs.
Do not change CHANGELOG.md file directly, but create a changeset with `yarn changeset` command and follow the instructions.

This will create a markdown file in the `.changeset` folder, that will be handled by the maintainers when merging the PR.
