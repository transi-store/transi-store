---
"@transi-store/cli": minor
---

Add the `--into` option to `merge` and `branch:merge`, to merge a branch into another branch instead of main: its keys and pending deletions move to that branch, and reach main when that branch is merged. Merging the translation branch of a pull request into the translation branch of its base keeps the keys of stacked pull requests from being lost. An empty `--into`, `main` or `master` merges into main.

The merge commands now require a transi-store server that returns `into` in the merge response.
