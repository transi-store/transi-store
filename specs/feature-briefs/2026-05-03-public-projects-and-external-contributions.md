---
title: Public projects and external contributions
status: draft
domain: projects, branches, authentication
owned_paths:
  - apps/website/drizzle/schema.ts
  - apps/website/app/routes.ts
  - apps/website/app/routes/orgs.$orgSlug.projects.$projectSlug.*
  - apps/website/app/lib/branches.server.ts
  - apps/website/app/lib/projects.server.ts
  - apps/website/app/middleware/auth.server.ts
required_docs:
  - docs/technical-notes/README.md
  - docs/technical-notes/architecture.md
  - docs/technical-notes/authentication.md
  - docs/technical-notes/database-schema.md
  - docs/technical-notes/routing.md
  - docs/technical-notes/code-patterns.md
  - docs/technical-notes/docs-pages.md
  - specs/feature-briefs/2026-03-14-handle-branch-and-git-sync.md
---

# Context

transi-store is currently a closed system: every project belongs to one organization, and only members of that organization can read or modify translations. Branches exist (see `2026-03-14-handle-branch-and-git-sync.md`) but they are limited to:

- Adding new keys (`branchId` on `translation_keys`, `NULL` = main).
- Marking existing main keys for deletion (`branch_key_deletions`).

A branch cannot currently hold a modified translation value for a key that already lives on main. Every translation update is written directly to main, regardless of which branch the user is "on".

We want to use transi-store to host the translations of open-source projects (e.g. `immutable-js.com`, whose docs live at `https://github.com/immutable-js/immutable-js/tree/main/website/docs`). For these projects, the contribution model is "anyone can open a pull request". transi-store should mirror this:

- A project maintainer publishes the project as **public**.
- Anyone with a transi-store account can open a "fork branch" on a public project and propose translation changes.
- Maintainers review the proposed branch and either merge it back to main or reject it.

The MDX/document translation feature (`markdown_document_translations`) is the natural starting point: documents are large, well-suited to PR-style review, and lower-stakes to expose publicly than the key/value catalogue.

# Goal

Enable a public-OSS contribution flow on top of transi-store, without breaking the existing private/multi-tenant model.

By the end of this spec (all phases), an external developer who is **not** a member of the `immutable-js` organization can:

1. Land on the public project page of `immutable-js` without logging in and read the current translations of its MDX documents.
2. Sign in with any OAuth account, fork the project into a personal branch on that public project, and edit MDX translations in their fork.
3. Submit the fork for review. A maintainer of the `immutable-js` org sees the proposal, reviews it, and merges it to main (or closes it).
4. The org's existing private projects, members, branches, and key/value workflows are unaffected.

This spec is a **planning document**, not an execution-ready brief. Each phase below should be split into its own dated spec under `specs/feature-briefs/` before implementation.

# Scope and non-goals

In scope (eventually, across phases):

- Project-level public/private visibility flag.
- Public read-only access (no authentication) to public projects.
- Authenticated-but-non-member contribution via a "fork branch" on public projects.
- Branch-level edit of existing main translations (overlay model), starting with **document/MDX files only**.
- Maintainer review and merge of an external fork branch.

Out of scope for the first iteration (revisit later):

- Editing key/value translations from a fork branch. Phase 1–4 are document-only.
- Anonymous/unauthenticated edits. Contributors must sign in (any provider).
- Forking across organizations (a fork branch lives on the upstream public project, not on a separate org-owned copy).
- Public listing/discovery of all public projects (a global directory). Public projects are reachable by direct URL only at first.
- Comment threads, line-level review, suggestions UI. The first review surface is a diff + accept/reject.

# Surfaces to modify (overall)

- `apps/website/drizzle/schema.ts` — `projects.visibility`, branch ownership fields, branch type/role columns.
- `apps/website/drizzle/relations.ts` — relations for the new fields.
- `apps/website/app/middleware/auth.server.ts` and the `userContext` flow — allow loaders on public projects to run with no user.
- `apps/website/app/lib/organizations.server.ts` — split "must be a member" from "may view this project" for public reads.
- `apps/website/app/lib/branches.server.ts` — branch ownership, fork-branch lifecycle, merge from external fork.
- `apps/website/app/lib/markdown-documents.server.ts` (and adjacent document-translation files) — branch-scoped overlay reads/writes for documents.
- `apps/website/app/routes.ts` and the project/branch routes — public read routes, fork creation route, review/merge route.
- `apps/website/app/docs/` — user-facing documentation of the public + contribution model.
- API docs / OpenAPI registration if any new endpoint is exposed.

# Constraints

- **Multi-tenant safety is non-negotiable.** A bug here must never expose private project data. The default for existing projects must remain private, and every loader on private data must continue to go through `requireOrganizationMembership()`.
- **Branch model evolves carefully.** The current invariant "a branch only adds new keys; modifications to main translations go straight to main" is load-bearing for the existing UX. Introducing branch-scoped overrides must not silently change the behaviour of org-internal branches. See [ADR-018] referenced from `database-schema.md` and the existing branch brief.
- **Authentication remains OAuth-only.** External contributors sign in with the same OAuth providers as everyone else; we do not introduce email/password or anonymous sessions.
- **Public read paths must not require any organization context.** Loaders on public routes should not call `requireOrganizationMembership()` and should not expose API keys, member lists, branches that are not relevant to the fork flow, or any private-only data.
- **Fork branches are upstream-owned, contributor-edited.** A fork branch lives on the upstream project (so the maintainer can review and merge it in place). The contributor has edit rights only on their own fork branch; only org members can merge.
- **No mass-write surface for unauthenticated users.** All write endpoints continue to require an authenticated session.
- **Documents first, key/value later.** Phases 1–4 only need to support document-format files (`projectFiles.format = document`, `markdown_document_translations`). Key/value branch overlays are explicitly deferred.

# Technical notes to read

- `docs/technical-notes/README.md`
- `docs/technical-notes/architecture.md` — entity hierarchy, multi-tenant model
- `docs/technical-notes/authentication.md` — session middleware, `requireOrganizationMembership`
- `docs/technical-notes/database-schema.md` — branches, `branch_key_deletions`, document tables
- `docs/technical-notes/routing.md` — manual route declaration in `routes.ts`
- `docs/technical-notes/code-patterns.md` — loader/action patterns, auth ordering
- `docs/technical-notes/docs-pages.md` — user-facing docs to update once the feature ships
- `specs/feature-briefs/2026-03-14-handle-branch-and-git-sync.md` — existing branch model and rationale

# Phasing

Each phase below is a candidate for its own dated spec under `specs/feature-briefs/`. The order matters: later phases assume the schema and middleware changes from earlier phases.

## Phase 1 — Public/private project visibility (read-only)

**Goal:** A project can be marked public; public projects are readable by anyone, including unauthenticated visitors.

- Schema: add `projects.visibility` (`'private' | 'public'`, default `'private'`).
- Middleware: introduce a "public-or-member" guard for project-scoped loaders. Private projects keep using `requireOrganizationMembership()`. Public projects allow anonymous reads but still resolve the project by `(orgSlug, projectSlug)`.
- Routes: existing project read routes (project home, file list, document viewer, key list) accept anonymous users when `visibility = 'public'`. Hide write controls (buttons, forms) and any private-only data (API keys, member list, invitation UI, AI translation actions) when the viewer is not a member.
- UI: a visibility toggle in project settings, restricted to org admins. Public projects show a clear "public" badge in the org dashboard and on the project page.
- Out of scope: any write surface for non-members.

**Acceptance:**

1. An org admin can flip a project to public and back to private from the project settings page.
2. With no session, navigating to `/orgs/:org/projects/:proj` of a public project renders the project page in a read-only state. Same URL on a private project returns 404 (do not reveal existence).
3. Existing private flows (loaders, actions, branches) are unaffected; existing tests pass.

## Phase 2 — Branch model: document-translation overrides on a branch

**Goal:** A branch can hold edits to existing main _document_ translations, not just additions and deletions.

This is the foundational schema change that makes external contributions possible. It is independent of the public-project flow but required by it.

- Decide the storage model for branch-scoped document overrides. Likely: extend `markdown_document_translations` with a nullable `branchId`, with `(projectFileId, locale, branchId)` unique. `branchId IS NULL` = main; non-null = override on that branch.
- Read path: when viewing a branch, return the branch row if it exists, otherwise fall back to the main row.
- Write path on a branch: writes against an existing main document create or update the branch row, never touch main.
- Merge path: at merge time, branch document rows replace main rows for the same `(projectFileId, locale)`, then the branch rows are removed.
- Close path: dropping a branch drops its document rows (cascade) without touching main.
- Key/value translations stay on the current model (no overlay) for now. The branch UI for documents shows "modified on this branch" badges where a branch row exists.

**Acceptance:**

1. On a branch, editing a main document's translation does not modify the main row.
2. The main view of the same document continues to show the unmodified value.
3. Merging the branch promotes branch rows to main; closing the branch discards them.
4. Existing branch addition/deletion flows for keys are unchanged.

## Phase 3 — Fork branches: ownership and non-member edit rights

**Goal:** A signed-in user who is not a member of a public project can create a branch (a "fork") on that project and edit document translations on it.

- Schema: add ownership/role fields on `branches`. At minimum, distinguish a regular org branch from a fork branch (e.g. `branches.kind = 'internal' | 'fork'`, plus a `created_by` that already exists). Authorization rules:
  - Internal branch: editable by any org member, mergeable by any org member (current behaviour).
  - Fork branch: editable only by `created_by`; mergeable only by org members; visible to org members and to the fork owner (not to the wider public unless we explicitly expose it later).
- Branch creation: a new route allows a signed-in non-member to create a fork branch on a public project. Quotas and rate-limits should be considered to avoid spam (e.g. one open fork per user per project, or N total).
- Edit surface: the existing branch document-edit UI (Phase 2) is reachable by the fork owner with the same permissions as an org member would have _on that branch only_.
- Visibility: while a fork is open, only the fork owner and org members of the upstream project can view it. The fork owner does not gain visibility into other branches or private project data.

**Acceptance:**

1. A non-member of a public project can sign in, click "Propose changes" / "Fork", and land on a freshly created branch they own.
2. The fork owner can edit document translations on that branch (Phase 2 mechanics).
3. Non-members and non-owners cannot read or edit the fork branch.
4. Org members of the upstream see the fork in a dedicated list (e.g. "Proposals" tab) alongside internal branches.

## Phase 4 — Review and merge of fork branches

**Goal:** Org maintainers review, accept, or reject a fork branch, completing the contribution loop.

- A "proposals" or "incoming forks" view per project, listing open fork branches with title, author, last-updated, and a per-document diff summary.
- A diff view for a fork branch's document changes (likely reusing the merge preview from the existing branch model, restricted to documents).
- Merge action: org members merge the fork branch into main using the Phase 2 promotion logic. The branch transitions to `status = 'merged'`.
- Reject action: org members close the fork. The fork owner is notified (in-app at minimum).
- Author lifecycle: the fork owner can also close their own fork. They cannot merge it.

**Acceptance:**

1. An org member sees an open fork in the proposals list with a diff of its document changes.
2. Merging promotes the fork's document overrides to main and marks the branch merged.
3. Rejecting closes the fork without modifying main.
4. The fork owner cannot merge their own fork; they can close it.

## Phase 5 — Polish, docs, follow-ups

- User-facing docs: update `apps/website/app/docs/usage.mdx` (and developer guide if relevant) with the public + contribution flow, mockups for the fork creation and review screens.
- Landing-page positioning: highlight the OSS use case (`immutable-js`-style projects) as a differentiator.
- Telemetry/audit: log fork creation, merge, reject events at the org level so maintainers have an audit trail.
- Follow-up candidates (separate specs):
  - Extend the overlay model to key/value translations.
  - Public listing/discovery of public projects.
  - Comment threads on a fork branch.
  - GitHub-side glue: a script or CLI command that round-trips between a transi-store fork and a real Git pull request on the upstream repo.

# Open questions

- Should a fork branch be allowed to edit _any_ document file in the project, or only files explicitly marked "open to contributions"? Maintainers may want a way to lock certain files.
- How do we surface public projects publicly (SEO, sitemap) without overwhelming the org's own surfaces?
- Should anonymous users be allowed to start a fork that converts into an authenticated branch upon sign-in, or do we always require sign-in first? (Default plan: require sign-in first; revisit if the friction is shown to hurt adoption.)
- Quotas on fork creation per user/project to mitigate spam.
- How do we handle a fork branch when the upstream main has moved on (a document the fork edits was deleted or renamed)? At minimum, surface a conflict; defer auto-rebase.
- Do we need a separate `forks` table, or is `branches.kind = 'fork'` plus existing fields enough? The simpler form is preferred unless we discover a strong reason to split.

# Validation (per phase, before merging that phase)

- `make lint-types` and `make test` pass.
- `make knip` clean.
- For phases that touch routes: manually walk the public read path with no session, the fork-owner path with a non-member session, and the maintainer path with an org-member session.
- For phases that touch the schema: `make db-push` on a fresh DB, plus an upgrade run on a DB that already contains the previous phase's schema.
- Update `docs/technical-notes/database-schema.md` and `docs/technical-notes/authentication.md` if the entity diagram or auth/membership rules change.
- Update `apps/website/app/docs/` once the user-facing flow is shippable (Phase 5 at the latest).
