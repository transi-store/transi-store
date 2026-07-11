# Branch merge API

## Endpoint

`POST /api/orgs/:orgSlug/projects/:projectSlug/branches/:branchSlug/merge`

Merges an open branch into main. The business logic lives in `mergeBranch()` (`apps/website/app/lib/branches.server.ts`) and is shared with the UI route at `routes/orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.merge.tsx`.

## Authentication

The route sits under the `api/orgs/:orgSlug` layout, so it goes through the standard `apiAuthMiddleware` + `apiOrgMiddleware` pipeline (`apps/website/app/middleware/api-auth.server.ts`). Both authentication modes accepted by other API endpoints work here:

- Bearer API key (`Authorization: Bearer <key>`)
- Session cookie

The route **does not** look up the calling user. `mergeBranch()` is called with `mergedBy = null` regardless of the auth mode. This is intentional: the API entry point is primarily used by automation (CI/CD via `@transi-store/cli`), and we don't want to surface a partial actor identity (API key id vs. user id) on the merge record. Only the UI action attributes the merge to a specific user.

## Status codes

| Code  | Body schema                                                        | When                                                      |
| ----- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| `200` | `BranchMergeSuccess` (`{ success: true, keysMoved, keysDeleted }`) | Merge succeeded.                                          |
| `400` | `BranchMergeError` (`{ error }`)                                   | Branch exists but is not open (already merged or closed). |
| `401` | `BranchMergeError`                                                 | Missing or invalid API key, no session.                   |
| `403` | `BranchMergeError`                                                 | API key does not belong to the requested organization.    |
| `404` | `BranchMergeError`                                                 | Project or branch not found.                              |
| `405` | `BranchMergeError`                                                 | Request method is not `POST`.                             |

Merging never produces a key conflict by construction: the unique index `unique_project_file_key` on `(project_id, file_id, key_name)` prevents a branch from ever holding a key that already exists on main.

## Error responses in `mergeBranch`

The API returns the common `{ error }` envelope for failures. The CLI preserves the HTTP status in `MergeBranchResult` and treats `404` as a missing branch when processing multiple configured projects.

## CLI

The `transi-store merge` command (in `@transi-store/cli`) wraps this endpoint. `--branch` is required: there is no git auto-detection, since the merge is destructive and the target must be explicit.

## OpenAPI

The response schemas are declared as factories in `packages/common/src/branch-merge-schema.ts` (`createBranchMergeSuccessResponseSchema`, `createBranchMergeErrorResponseSchema`) and reused on both sides: `apps/website/app/lib/api-doc/schemas/branch-merge.ts` enriches them with `.openapi()` metadata for the registry, and `@transi-store/cli` validates the API response with the same factory. See [openapi-documentation.md](./openapi-documentation.md#shared-schemas-always-use-packagescommon) for the rule and pattern.
