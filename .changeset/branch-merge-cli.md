---
"@transi-store/cli": minor
---

Add `branch:merge` command to merge a project branch into main from the CLI. The command targets the new `POST /api/orgs/:orgSlug/projects/:projectSlug/branches/:branchSlug/merge` endpoint. `--branch` is required (no git auto-detection). On conflict the command exits `1` and prints the colliding keys.
