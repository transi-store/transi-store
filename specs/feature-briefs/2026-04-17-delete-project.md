---
title: Delete a project from project settings
status: draft
domain: projects
owned_paths:
  - apps/website/app/routes/orgs.$orgSlug.projects.$projectSlug.settings.tsx
  - apps/website/app/lib/projects.server.ts
  - apps/website/app/locales/en/translation.json
  - apps/website/app/locales/fr/translation.json
  - apps/website/app/locales/de/translation.json
  - apps/website/app/locales/es/translation.json
  - apps/website/tests/test-db.ts
  - apps/website/app/lib/**/*.test.ts
required_docs:
  - docs/technical-notes/README.md
  - docs/technical-notes/routing.md
  - docs/technical-notes/authentication.md
  - docs/technical-notes/database-schema.md
  - docs/technical-notes/code-patterns.md
---

# Context

Projects can be created, but there is currently no way to delete one from the product UI, even when it has no languages or translations yet.

The request is to add project deletion from the project settings page at `/orgs/:orgSlug/projects/:projectSlug/settings`.

# Goal

Allow an authenticated organization member to delete a project from the settings page through an explicit destructive confirmation flow.

Deleting the project must remove the project row and all project-scoped data from the database, including project languages, branches, translation keys, translations, and branch deletion records.

# Surfaces to modify

- `apps/website/app/routes/orgs.$orgSlug.projects.$projectSlug.settings.tsx`
- `apps/website/app/lib/projects.server.ts`
- `apps/website/app/locales/{en,fr,de,es}/translation.json`
- a fetcher-backed loader surface or resource route used only when the delete dialog opens
- server-side tests around project deletion and deletion summary queries

# Constraints

- Keep the existing auth pattern for app routes: `userContext` plus `requireOrganizationMembership()`.
- Keep the destructive entry point on the existing project settings page.
- Do not compute delete-summary counts on every settings page load. Fetch them only when the delete dialog is opened.
- Do not rely on deleting the project row and letting database cascades do the work. Perform explicit project-scoped deletes in application code inside a transaction, then delete the project row last.
- Existing schema-level foreign-key cascades can remain untouched for now; this brief only changes the deletion flow implementation.
- The confirmation input is a UI safeguard only. The server action must not validate that the typed value matches `{organizationSlug}/{projectSlug}`.
- The dialog must clearly warn that deletion is irreversible and that the project and all associated data become inaccessible.
- The dialog must display counts for keys, translations, and branches that will be removed.
- Count active project content across main and branches, but exclude soft-deleted keys and the translations attached to them.
- The user must manually type `{organizationSlug}/{projectSlug}` before the destructive submit becomes enabled.

# Notes techniques a lire

- `docs/technical-notes/README.md`
- `docs/technical-notes/routing.md`
- `docs/technical-notes/authentication.md`
- `docs/technical-notes/database-schema.md`
- `docs/technical-notes/code-patterns.md`

# Criteres d'acceptation

1. The page `/orgs/:orgSlug/projects/:projectSlug/settings` exposes a destructive action to delete the current project.
2. Clicking the delete action opens a confirmation dialog with an irreversible warning and counts for the project-scoped keys, translations, and branches that will be deleted.
3. The dialog includes helper copy that tells the user to type `{organizationSlug}/{projectSlug}`, and the confirm button stays disabled until the typed value matches exactly.
4. Submitting the delete action as an authenticated organization member removes the project row and all dependent project data from the database through explicit transactional deletes in application code.
5. After deletion, the deleted project is no longer reachable from its previous URL and the user is redirected away from the deleted project page.

# Validation

- `make lint-types`
- `make test`
- Manual check of the destructive flow on the project settings page, including disabled/enabled confirm states and post-delete redirect behavior
