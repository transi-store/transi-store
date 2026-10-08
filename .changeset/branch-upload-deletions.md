---
"@transi-store/cli": minor
---

`upload:config` now stages for deletion the keys removed on a branch. On a branch, the default language files are compared with their version at the git merge-base with `main`/`master`, and the removed keys are marked "to delete" on the transi-store branch. This requires the full git history (`fetch-depth: 0` in CI).
