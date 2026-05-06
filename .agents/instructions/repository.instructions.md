---
description: This file contains repository-wide instructions and guidelines for contributors and AI agents.
applyTo: "**/*.ts, **/*.tsx, **/*.md"
---

# transi-store repository instructions

This file is the generic repository-wide instruction source. Tool-specific entry points may symlink to it.

- transi-store is a Yarn Berry v4 monorepo with `apps/website`, `packages/common`, and `packages/cli`.
- The development environment runs inside Docker. Prefer `make dev`, `make build`, `make test`, `make lint-types`, `make knip`, and `make db-push`.
- Read `docs/technical-notes/README.md` before making technical changes, then open the notes relevant to the files you touch.
- Treat `docs/technical-notes/` as the durable source of truth. AI-specific instructions, skills, and specs should reference it instead of duplicating it.
- Treat `.agents/` as the canonical location for AI instructions and skills. Tool-specific paths such as `.github/` and `.claude/` are compatibility adapters.
- Website application code lives in `apps/website/`. Do not create app files at the repository root.
- Routes are manually declared in `apps/website/app/routes.ts`. Adding a route requires both the route file and the route declaration.
- Server-only code must stay in `*.server.ts`.
- Authentication is middleware-based. App routes use `userContext`; API routes under `api/orgs/:orgSlug` use `orgContext`.
- All protected operations are multi-tenant and must scope work to the current organization.
- When changing an API endpoint, keep shared Zod schemas and OpenAPI registration in sync.
- When changing a user-visible feature, update the MDX docs in `apps/website/app/docs/` when needed.
- Always add or update tests when you change behavior: cover new code paths, error branches, and bug fixes. A change is not complete until it has tests, and the existing test suite (`make test`) still passes.
- If a task brief exists in `specs/`, use it as execution context, not as the source of truth for repository rules.
