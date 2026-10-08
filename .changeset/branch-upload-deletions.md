---
"@transi-store/cli": minor
---

`upload:config` now stages for deletion the keys removed on a branch. On a branch, the default language files are compared with their version at the git merge-base with `main`/`master`, and the removed keys are marked "to delete" on the transi-store branch. Keys previously uploaded to the branch and since removed from the file are deleted from the branch (keys created from the UI are kept). This requires the default branch (`main`/`master`) to be available in the git repository.
