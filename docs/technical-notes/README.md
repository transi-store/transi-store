# Technical notes

Detailed technical documentation for the transi-store implementation.

## Overview

| File                                                   | Description                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| [architecture.md](./architecture.md)                   | General project architecture, tech stack, entity hierarchy          |
| [routing.md](./routing.md)                             | React Router v7 route configuration (manual, not file-based)        |
| [authentication.md](./authentication.md)               | OAuth2/OIDC with PKCE, multi-provider, session management           |
| [routes-access.md](./routes-access.md)                 | Project access roles (MEMBER/VIEWER), middleware, project layouts   |
| [database-schema.md](./database-schema.md)             | Full PostgreSQL schema, constraints, relations, TypeScript types    |
| [export-api.md](./export-api.md)                       | JSON/XLIFF export API, authentication by key or session             |
| [import-system.md](./import-system.md)                 | Bulk import, overwrite/skip strategies, validation                  |
| [code-patterns.md](./code-patterns.md)                 | Common patterns (routes, Drizzle queries, forms, auth)              |
| [code-formatting.md](./code-formatting.md)             | Prettier formatting rules                                           |
| [traductions.md](./traductions.md)                     | Website translation management (i18next)                            |
| [dev-setup-and-testing.md](./dev-setup-and-testing.md) | Local development setup and testing                                 |
| [openapi-documentation.md](./openapi-documentation.md) | Auto-generated OpenAPI documentation from Zod, rendered with Scalar |
| [docs-pages.md](./docs-pages.md)                       | User documentation pages (MDX), maintenance and structure           |

## Recommended reading order

### To understand the project

1. **architecture.md** — Overview of the structure
2. **database-schema.md** — Understanding the data model
3. **authentication.md** — OAuth authentication flow

### To develop a feature

1. **routing.md** — How to add a new route
2. **code-patterns.md** — Patterns to follow
3. **database-schema.md** — Available data structures
4. **traductions.md** — Translation management

### To integrate with the API

1. **export-api.md** — Full documentation of the export endpoint
2. **import-system.md** — How to import translations
3. **openapi-documentation.md** — Auto-generated OpenAPI documentation

## See also

- **[Architecture Decision Records](../decisions/)** — History of architectural decisions
- **[AI-friendly architecture](../ai/README.md)** — Structure of instructions, skills and specs for AI agents
- **[Main README](../../README.md)** — Quick start guide
