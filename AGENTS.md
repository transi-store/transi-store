# AGENTS.md

This repository uses a layered AI guidance model. Keep each layer focused on its job:

1. `docs/technical-notes/` is the durable source of truth for architecture and implementation details.
2. `.agents/` is the canonical home for repository AI instructions and reusable skills.
3. `.github/` and `.claude/` are compatibility layers for tools that require tool-specific locations.
4. `specs/` contains execution-oriented feature briefs and task context.

## Start here

For any technical task, read `docs/technical-notes/README.md` first, then open the notes relevant to the files you are touching.

If a request comes with a brief in `specs/`, use it as task context, not as the source of truth for repository behavior. Durable rules belong in `docs/technical-notes/`.

Use `.agents/README.md` and `docs/ai/README.md` when you need to understand how the repository organizes generic instructions, compatibility symlinks, and reusable skills.

## Repository overview

transi-store is an open-source translation management platform. It is a Yarn Berry v4 monorepo with:

- `apps/website` - main React Router v7 SSR application
- `packages/common` - shared types and utilities
- `packages/cli` - `@transi-store/cli`

The app runs inside Docker. Prefer the Make commands documented below instead of assuming a host Node.js setup.

## Common commands

```bash
make dev
make build
make test
make lint-types
make knip
make db-push
make shell
```

If Make is unavailable, use `docker compose exec app yarn ...`.

## Critical repository rules

- Routes are manually declared in `apps/website/app/routes.ts`. Adding a route requires both the route file and the route declaration.
- Server-only code lives in `*.server.ts`.
- Auth is middleware-based, not per-loader:
  - app routes use session auth via `userContext`
  - API routes under `api/orgs/:orgSlug` use API/session auth via `orgContext`
- All protected data is multi-tenant. Use `requireOrganizationMembership()` or the organization resolved by API middleware.
- API documentation is generated from shared Zod schemas in `apps/website/app/lib/api-doc/schemas/` and registered in `openapi.server.ts`.
- User-facing documentation lives in `apps/website/app/docs/` as MDX and should be updated when features change.
- Do not edit `CHANGELOG.md` directly. Use Changesets.

## Where to read next

- Routes and layout hierarchy: `docs/technical-notes/routing.md`
- Auth and middleware: `docs/technical-notes/authentication.md`
- Database and relations: `docs/technical-notes/database-schema.md`
- Common implementation patterns: `docs/technical-notes/code-patterns.md`
- User docs maintenance: `docs/technical-notes/docs-pages.md`
- AI-facing repository structure: `docs/ai/README.md`
