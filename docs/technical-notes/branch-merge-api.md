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

| Code | Body schema | When |
|------|-------------|------|
| `200` | `BranchMergeSuccess` (`{ success: true, keysMoved, keysDeleted }`) | Merge succeeded. |
| `400` | `BranchMergeError` (`{ error }`) | Branch exists but is not open (already merged or closed). |
| `401` | `BranchMergeError` | Missing or invalid API key, no session. |
| `403` | `BranchMergeError` | API key does not belong to the requested organization. |
| `404` | `BranchMergeError` | Project or branch not found. |
| `405` | `BranchMergeError` | Request method is not `POST`. |
| `409` | `BranchMergeConflict` (`{ error, conflictingKeys[] }`) | Some branch keys collide with existing main keys. |

`409` is reserved strictly for the unique-constraint conflict case, so clients can rely on the presence of `conflictingKeys` whenever they receive that status.

## Discriminated result in `mergeBranch`

`MergeBranchResult` carries a `reason` field on failure (`"not_found" | "not_open" | "conflict"`). The API route maps `reason` to a status code without string-matching on `error`. The UI keeps reading `error` and `conflictingKeys` as before.

## CLI

The `transi-store branch:merge` command (in `@transi-store/cli`) wraps this endpoint. `--branch` is required: there is no git auto-detection, since the merge is destructive and the target must be explicit. On `409` the CLI prints every conflicting key on its own line and exits `1`.

## OpenAPI

Schemas live in `apps/website/app/lib/api-doc/schemas/branch-merge.ts` and are registered in `apps/website/app/lib/api-doc/openapi.server.ts` alongside the existing translation endpoints.
