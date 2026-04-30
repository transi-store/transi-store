# Database schema

## Overview

transi-store uses **PostgreSQL 18** with **Drizzle ORM v1.0.0-beta**.

**Source of truth**: The schema is defined in `apps/website/drizzle/schema.ts`

**Applying changes**: Via `make db-push` or `docker compose exec app yarn db:push` (no migrations for now, suited to early-stage development)

## Entity hierarchy

```
┌─────────────────────┐
│   users             │  (OAuth users)
└─────────────────────┘
          │
          │ lastOrganizationId (FK)
          ▼
┌─────────────────────┐
│  organizations      │  (Workspaces/tenants)
└─────────────────────┘
          │
          ├──┬─────────────────────────────────┬──────────────────────┐
          │  │                                 │                      │
          ▼  ▼                                 ▼                      ▼
┌──────────────────┐  ┌─────────────────────┐ ┌──────────────────┐  ┌────────────┐
│ organization_    │  │ organization_       │ │   api_keys       │  │  projects  │
│ members          │  │ invitations         │ └──────────────────┘  └────────────┘
└──────────────────┘  └─────────────────────┘                              │
                                                       ┌───────────────────┴──────────────────┐
                                                       │                  │                    │
                                                       ▼                  ▼                    ▼
                                              ┌──────────────────┐ ┌──────────────┐ ┌────────────────────┐
                                              │ project_         │ │  branches    │ │ translation_keys   │
                                              │ languages        │ └──────────────┘ │ (deletedAt: soft)  │
                                              └──────────────────┘        │         └────────────────────┘
                                                                          │                    │
                                                                          ▼                    ▼
                                                                ┌──────────────────┐ ┌────────────────────┐
                                                                │ branch_key_      │ │  translations      │
                                                                │ deletions        │ └────────────────────┘
                                                                └──────────────────┘
```

## Key concepts

### Multi-tenant (organizations)

- **Isolation**: All data is isolated per organization
- **Membership**: `organization_members` table (N-N between users and organizations)
- **Cascade delete**: Deleting an organization deletes all its projects, API keys, etc.

### Important unique constraints

| Table                      | Constraint                                | Reason                          |
| -------------------------- | ----------------------------------------- | ------------------------------- |
| `users`                    | `(oauth_provider, oauth_subject)` unique  | One OAuth account = one user    |
| `organizations`            | `slug` globally unique                    | Unique URLs                     |
| `organization_members`     | `(organization_id, user_id)` unique       | No duplicates                   |
| `organization_invitations` | `(organization_id, invited_email)` unique | One active invitation per email |
| `projects`                 | `(organization_id, slug)` unique          | Slug unique per org only        |
| `translation_keys`         | `(project_id, key_name)` unique           | One key per name per project    |
| `translations`             | `(key_id, locale)` unique                 | One translation per key-locale  |
| `branch_key_deletions`     | `(branch_id, translation_key_id)` unique  | One deletion per key per branch |

### Important relations

- **Users** ↔ **Organizations**: N-N via `organization_members`
- **Organizations** → **Projects**: 1-N (cascade delete)
- **Projects** → **TranslationKeys**: 1-N (cascade delete)
- **Projects** → **Branches**: 1-N (cascade delete)
- **TranslationKeys** → **Translations**: 1-N (cascade delete)
- **Branches** → **BranchKeyDeletions**: 1-N (cascade delete)

### Translation branches

Branches allow isolating translation changes (additions and deletions) before merging them to main.

- **Additions**: Translation keys have a nullable `branchId` field. `NULL` = main, value = branch.
- **Deletions**: The `branch_key_deletions` table stores main keys marked for deletion in a branch.
- **Merge**: Moves additions to main (`branchId = NULL`) and soft-deletes marked keys (`deletedAt = now()`).
- **Soft-delete**: Keys with a non-null `deletedAt` are excluded from exports, search, and the main view.

See [ADR-018](../decisions/ADR-018-suppression-traductions-branches.md) for design details.

### Invitations

Workflow:

1. Admin creates invitation with email → generates unique random code
2. Link sent with the code
3. User clicks, authenticates with that email
4. Automatically added to the organization + invitation deleted

### API keys

- Generated with `base64url(crypto.randomBytes(24))` → 32 characters
- Scope: one organization
- Usage: `Authorization: Bearer <key>` header
- Tracking: `last_used_at` updated on every call

## Fuzzy search (pg_trgm)

**Setup**: `make db-setup-search` or `docker compose exec app yarn db:setup-search` (run once)

This script:

1. Enables the PostgreSQL `pg_trgm` extension
2. Creates GIN trigram indexes on:
   - `translation_keys.key_name`
   - `translation_keys.description`
   - `translations.value`

**Usage**: The `%` operator enables similarity search (threshold: 0.3)

**Implementation**: See `app/lib/search.server.ts`

---

## TypeScript types

Drizzle automatically infers types from `apps/website/drizzle/schema.ts`:

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Available for all tables**: User, Organization, Project, TranslationKey, Translation, etc.

---

## Drizzle relations

Defined in `apps/website/drizzle/relations.ts` for eager data loading in a single query.

**Example**: Load an organization with its projects

```typescript
const org = await db.query.organizations.findFirst({
  where: eq(schema.organizations.slug, "my-org"),
  with: { projects: true },
});
```

---

## Schema management

**Apply changes**: `make db-push` or `docker compose exec app yarn db:push`

- Applies `apps/website/drizzle/schema.ts` directly to the database
- No migration files (suited for early-stage development)

**Browse**: `make db-studio` or `docker compose exec app yarn db:studio`

- Drizzle Studio web interface to explore tables and data

---

## Source files

- **Schema**: `apps/website/drizzle/schema.ts`
- **Relations**: `apps/website/drizzle/relations.ts`
- **Configuration**: `apps/website/app/lib/db.server.ts`

## References

- [Drizzle ORM - PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
