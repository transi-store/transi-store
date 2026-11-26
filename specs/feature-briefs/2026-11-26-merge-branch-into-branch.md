---
title: Merge a branch into another branch
status: draft
domain: branches
owned_paths:
  - apps/website/drizzle/schema.ts
  - apps/website/app/lib/branches.server.ts
  - apps/website/app/routes/api.orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.merge.tsx
  - apps/website/app/lib/api-doc/
  - packages/common/src/branch-merge-schema.ts
  - packages/cli/src/
required_docs:
  - docs/technical-notes/README.md
  - docs/technical-notes/branch-merge-api.md
  - docs/technical-notes/database-schema.md
  - docs/technical-notes/openapi-documentation.md
---

Status: in-progress

## Tracking

Next step: review the diff and commit (nothing committed yet), then step 9 after the CLI release.

- [x] 1. `branches.merged_into_branch_id` column, applied with `make db-push` (2026-11-26, not committed)
- [x] 2. `mergeBranch(branchId, mergedBy, into?)` in `branches.server.ts`, with tests (2026-11-26, not committed)
- [x] 3. `into` query parameter on the merge API route, i18n error messages, route tests (2026-11-26, not committed)
- [x] 4. OpenAPI: `into` query parameter and `into` response field (2026-11-26, not committed)
- [x] 5. Shared schemas (`packages/common`): `into` query parameter, required `into` response field (2026-11-26, not committed)
- [x] 6. CLI: `--into` on `merge` and `branch:merge`, with tests (2026-11-26, not committed)
- [x] 7. Docs: `branch-merge-api.md`, `database-schema.md`, `openapi-documentation.md`, CLI README, `developer.mdx` (en, fr, de, es); no ADR for this small feature (2026-11-26, not committed)
- [x] 8. Changeset for `@transi-store/cli` (`@transi-store/common` is private) (2026-11-26, not committed)
- [ ] 9. Outside this repository (separate sessions, after the release): `into` input on `transi-store/merge-branch-action`, `merge-translations-branch.yml` in the consumer repositories

Decisions:

- `into` is a query parameter: the endpoint takes no body today, and a query parameter keeps a call without it unchanged.
- A missing target branch is created, like the import does: in a stack of PRs, the intermediate branches often have no key of their own.
- A merged target branch is resolved through its `mergedIntoBranchId` chain, down to an open branch or main.
- No Drizzle relation for `mergedIntoBranchId`: nothing reads it through the relational API.
- No backward compatibility with older servers (2026-11-26 review): `into` is required in the response, and the CLI no longer handles a server that ignores the parameter.
- The unused inferred types of the branch merge schemas are removed; the CLI validates `into` with the shared query schema before calling the API.
- An empty `--into` merges into main, so that a CI can pass the base branch of a pull request without a condition.

## Context

A key belongs to a single branch, because of the unique index `(project_id, file_id, key_name)`.
In a stack of pull requests, PR B (branch `b`) is merged into PR A (branch `a`), then A into main.
The upload that follows the git merge of B into `a` finds the keys of B already present on branch `b`,
skips them, and does not create branch `a` since it adds nothing.
The CI merges branch `a` into main when A is merged (`a` does not exist), and branch `b` is never merged:
its keys never reach main, and the next download removes them from the code.

Deletions do not have this problem: the upload on `a` compares the files with the merge-base with main and stages the deletions on `a`.

## Goal

`merge --branch b --into a` moves the additions and the staged deletions of branch `b` to branch `a`.
A CI merges the transi-store branch of a pull request into the transi-store branch of its base,
as git does, and the keys of the whole stack reach main when the bottom of the stack is merged.

## Behavior

`mergeBranch(branchId, mergedBy, into?: string)`:

```ts
// into = undefined: unchanged, merge into main
// into = "a":
target = resolveTarget(projectId, "a")
// - no branch "a"                 → create branch "a" (open)
// - "a" open                      → "a"
// - "a" merged, mergedIntoBranchId → follow the chain
// - "a" merged into main (null)   → main
if (target?.id === branchId) → MERGE_FAILURE_REASON.INTO_ITSELF

transaction:
  update translation_keys set branch_id = target.id where branch_id = branchId
  insert into branch_key_deletions (target.id, key) ... on conflict do nothing
  delete from branch_key_deletions where branch_id = branchId
  update branches set status = merged, merged_into_branch_id = target.id, ...
```

Into main, the behavior is the current one (keys to main, deletions applied as soft-deletes).

API, `POST /api/orgs/:orgSlug/projects/:projectSlug/branches/:branchSlug/merge?into=a`:

| Case                                 | Status    | Body                                                     |
| ------------------------------------ | --------- | -------------------------------------------------------- |
| merged                               | `200`     | `{ success, keysMoved, keysDeleted, into: "a" \| null }` |
| `into` resolves to the merged branch | `400`     | `{ error }`                                              |
| source branch not open, or not found | unchanged | unchanged                                                |

`into` in the response is the resolved target (`null` for main).
`keysDeleted` counts the deletions applied on main, or carried over to the target branch.

CLI:

```bash
transi-store merge --branch b --into a
transi-store branch:merge -o org -p project --branch b --into a
```

The CLI validates `into` with the shared query schema before calling the API, and requires `into` in the response.

## Constraints

- A merge without `into` behaves exactly as today (API, UI, CLI).
- The target branch belongs to the same project as the source branch.
- The UI merge page keeps merging into main only.

## Acceptance criteria

1. `merge --branch b --into a` moves the keys and the staged deletions of `b` to `a`, and `a` is created when missing.
2. Merging `b` into `a` after `a` was merged into main moves the keys of `b` to main.
3. The export with `?branch=a` contains the keys merged from `b`.
4. The OpenAPI document shows the `into` query parameter and response field.

## Validation

- `branches.server.test.ts`, the merge route test, `branchMerge.test.ts` and `mergeForConfig.test.ts`
- `make lint-types`, `make knip`

## Findings

- In the container, `yarn workspace … test` fails with "command not found: vitest"; `docker compose exec -w /app/apps/website app /app/node_modules/.bin/vitest run <file>` works.
- On the host, website tests fail on the root-owned `.react-router/types` written by the container; CLI tests run fine on the host (`../../node_modules/.bin/vitest run` from `packages/cli`).
- The CLI type-check reads `@transi-store/common` from its `dist`: rebuild it (`tsc` in `packages/common`) after changing a shared schema.
- With an `argParser` returning `undefined` for an empty value, commander still passed `""` to the action: the empty `--into` is normalized in the action instead.
- Prettier already reports the MDX docs as unformatted on main; they are not in `lint-staged`.
