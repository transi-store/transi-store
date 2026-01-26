# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Structure

This project maintains detailed technical documentation in the `docs/` folder:

### Essential Reading

**Before making any changes**, please read:

1. **[docs/technical-notes/](./docs/technical-notes/)** - Technical implementation details
   - [architecture.md](./docs/technical-notes/architecture.md) - Overall system architecture
   - [routing.md](./docs/technical-notes/routing.md) - React Router v7 route configuration
   - [authentication.md](./docs/technical-notes/authentication.md) - OAuth2/OIDC flow with PKCE
   - [database-schema.md](./docs/technical-notes/database-schema.md) - PostgreSQL schema and relationships
   - [export-api.md](./docs/technical-notes/export-api.md) - Translation export API (JSON/XLIFF)
   - [import-system.md](./docs/technical-notes/import-system.md) - Translation import system
   - [code-patterns.md](./docs/technical-notes/code-patterns.md) - Common coding patterns
   - [code-formatting.md](./docs/technical-notes/code-formatting.md) - Prettier formatting rules

2. **[docs/decisions/](./docs/decisions/)** - Architecture Decision Records (ADRs)
   - Review relevant ADRs when making architectural changes
   - See [docs/decisions/README.md](./docs/decisions/README.md) for the complete list

3. **[README.md](./README.md)** - Quick start guide and features overview

## Quick Command Reference

```bash
# Development
yarn dev                     # Start dev server (http://localhost:5173)
yarn typecheck               # Type check with TypeScript
yarn build                   # Build for production

# Database
yarn db:push                 # Apply schema to database (no migrations)
yarn db:studio               # Open Drizzle Studio GUI
yarn db:setup-search         # Enable pg_trgm + GIN indexes (run once)

# Setup
yarn install                 # Install dependencies
cp .env.example .env         # Create environment file
docker compose up -d         # Start PostgreSQL
```

## Key Architecture Points

### Tech Stack
- **Framework**: React Router v7 (SSR framework mode)
- **UI**: Chakra UI v3 + React 19
- **Database**: PostgreSQL 17 + Drizzle ORM v1.0.0-beta
- **Auth**: OAuth2/OIDC via Arctic (Google + Mapado providers)
- **Package Manager**: Yarn Berry v4

### Critical Patterns

1. **Routes**: Manually configured in `app/routes.ts` (NOT file-based discovery)
   - Adding a new route requires both creating the file AND declaring it in `routes.ts`

2. **Server-only code**: Use `.server.ts` suffix for code that must never reach the client
   - Database queries, auth logic, secrets

3. **Authentication flow**:
   ```typescript
   const user = await requireUser(request)
   const org = await requireOrganizationMembership(user, params.orgSlug)
   ```

4. **Database schema changes**: Use `yarn db:push` (no migrations for now)

5. **Multi-tenant**: All data isolated by organization via membership checks

## Environment Variables

Required in `.env`:
```bash
DATABASE_URL="postgresql://..."
OIDC_ISSUER="https://..."
OIDC_CLIENT_ID="..."
OIDC_CLIENT_SECRET="..."
SESSION_SECRET="..."
```

## When Working on This Codebase

1. **Always read the relevant technical-notes** before implementing features
2. **Follow existing patterns** documented in code-patterns.md
3. **Check ADRs** for context on past decisions
4. **Verify route configuration** in `app/routes.ts` when adding routes
5. **Run `yarn typecheck`** before committing

---

**For detailed implementation guidance, always refer to the `docs/technical-notes/` folder.**
