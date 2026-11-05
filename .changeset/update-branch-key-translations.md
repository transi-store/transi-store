---
"@transi-store/cli": patch
---

On a branch, `upload` and `upload:config` now update the translations of the keys created on that branch, whatever the strategy: a wording changed while working on a branch is no longer ignored by the default `skip` strategy. Translations of main keys still follow the strategy, so a branch never changes main before it is merged.
