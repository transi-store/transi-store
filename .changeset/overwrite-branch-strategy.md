---
"@transi-store/cli": minor
---

Add the `overwrite-branch` import strategy, now the default of `upload` and `upload:config`: on a branch, the translations of the keys created on that branch are updated with the uploaded files, so a wording changed while working on a branch is no longer ignored. Existing translations of main keys are still kept, so a branch never changes main before it is merged. Without a branch, `overwrite-branch` behaves like `skip`. A translation of a branch key edited in the web app is overwritten by the next upload of its file, unless the file was downloaded again. Pass `--strategy skip` to keep the previous behavior.

This strategy requires a transi-store server that supports it: with an older server, `upload` and `upload:config` fail unless you pass `--strategy skip`.
