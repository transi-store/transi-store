# ADR-018: Deleting translation keys in branches

**Date**: 2026-03-21

**Status**: Accepted ✅

## Context

The branch system allows isolating **additions** of translation keys per feature, before merging them into main. However, there was no mechanism to prepare the **deletion** of existing keys within a branch.

In practice, during a refactor or cleanup, it is common to want to remove obsolete keys. Without this feature, deletions had to be performed directly on main, with no opportunity for review or logical grouping with other changes.

## Decision

### 1. `branch_key_deletions` table to track pending deletions

Rather than modifying main keys directly, a new join table `branch_key_deletions` stores **deletion intentions**:

```
branch_key_deletions
├── id (PK)
├── branch_id (FK → branches, ON DELETE CASCADE)
├── translation_key_id (FK → translation_keys, ON DELETE CASCADE)
├── created_at
└── UNIQUE(branch_id, translation_key_id)
```

This approach allows:

- Preparing deletions without impacting main
- Restoring (cancelling) a planned deletion before merge
- Having a clear preview of changes at merge time

### 2. Soft-delete at merge via `deletedAt`

A new nullable `deletedAt` field is added to the `translation_keys` table. At merge time:

- Keys marked for deletion receive `deletedAt = now()` (soft-delete)
- Soft-deleted keys are excluded from exports, search, and the main view
- Data is retained in the database for auditability

### 3. Tabbed interface

The branch page adopts an **"Additions" / "Deletions"** tab system:

- The **Additions** tab retains the existing behaviour (list of added keys)
- The **Deletions** tab offers:
  - A search among main keys (ILIKE)
  - Checkboxes to select keys for deletion
  - The list of planned deletions with a restore button

### 4. Extended filtering for exports

When an export is requested with `?branch=<slug>`, keys marked for deletion in that branch are excluded from the export, in addition to already soft-deleted keys. This allows testing the "post-merge" export before actually merging.

## Reasons

1. **Non-destructive**: Soft-delete preserves data, allowing future restoration if needed
2. **Consistency with the existing model**: The join table follows the same pattern as branch keys (isolation per branch, cleanup at merge)
3. **Clear separation**: Tabs visually distinguish additions from deletions, avoiding confusion
4. **Pre-merge reversibility**: A key can be removed from the deletion batch before merging
5. **Compatibility**: Soft-deleted keys are transparent to existing queries thanks to the `deletedAt IS NULL` filter

## Alternatives considered

### 1. Immediate deletion (hard delete)

**Rejected**: Irreversible and does not allow grouping deletions in a branch for review.

### 2. `action` field on `translation_keys` (type: 'add' | 'delete')

**Rejected**: Keys to be deleted already exist on main (`branchId = NULL`). Adding an action field to a main key without creating a duplicate would violate the unique constraint `(projectId, keyName)`. A separate join table is cleaner.

### 3. Duplicating the key on the branch with a deletion flag

**Rejected**: Would violate the unique constraint `(projectId, keyName)` and complicate the merge logic.

## Consequences

### Positive

- Branches now support both additions and deletions
- The review workflow is complete: everything that will change at merge is visible
- Export with `?branch=` faithfully reflects the post-merge state
- Soft-deleted keys remain in the database for audit/future restoration

### Negative

- Soft-deleted keys accumulate in the database (no automatic purge planned)
- All queries on `translation_keys` must filter `deletedAt IS NULL` — easy to forget in future queries
- No post-merge restoration UI (out of scope, potential future feature)

## Files created/modified

### Modified

- `drizzle/schema.ts` — Added `deletedAt` on `translationKeys`, new `branchKeyDeletions` table, exported types
- `drizzle/relations.ts` — Relations for `branchKeyDeletions`
- `app/lib/branches.server.ts` — CRUD functions for branch deletions, updated merge
- `app/lib/translation-keys.server.ts` — Soft-delete filter in `branchFilter()` and `getProjectTranslations()`
- `app/lib/search-utils.server.ts` — Soft-delete filter in search
- `app/routes/orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.tsx` — Additions/Deletions tabs, addDeletions/removeDeletion actions
- `app/routes/orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.merge.tsx` — Separate additions/deletions sections
- `app/routes/orgs.$orgSlug.projects.$projectSlug.branches._index.tsx` — Deletions badge
- `app/locales/{en,fr,es}/translation.json` — 14 new i18n keys

## References

- [ADR-008](./ADR-008-migration-postgresql-drizzle-v1.md) — Migration to PostgreSQL with Drizzle ORM
- [ADR-010](./ADR-010-fuzzy-search.md) — Fuzzy search with pg_trgm
- [Soft delete pattern](https://en.wiktionary.org/wiki/soft_delete) — Logical deletion pattern
