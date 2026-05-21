---
name: create-pull-request
description: Create or update a pull request for this repository. Use this when asked to open a PR, write a PR body, or prepare a branch for review.
---

Use this workflow when preparing a pull request:

1. Summarize the change set clearly and keep the pull request title specific.
2. Keep the pull request description short and useful.
3. Do not include AI watermarks, attribution banners, or generated-by notices in the pull request title or description.
4. Mention only the most relevant user-facing or reviewer-facing changes.
5. If the repository has issue links or follow-up notes that matter, include them briefly instead of writing a long narrative.
6. If the diff includes any `.md` or `.mdx` file, add a short warning in the description noting that these files are normally edited through the transi-store UI and that the direct edit is intentional. Skip this for `CHANGELOG.md`, `.changeset/*.md`, and AI-facing instructions (`AGENTS.md`, `CLAUDE.md`, `.agents/**`, `.github/**`, `.claude/**`).

When using `gh pr create`, prefer an explicit title and body over verbose auto-generated content.
