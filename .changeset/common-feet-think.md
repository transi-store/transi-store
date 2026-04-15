---
"@transi-store/cli": minor
---

### Added

- Support for YAML, CSV, PO, INI, and PHP translation formats in `download` and `upload` commands.

### Fixed

- Fix export for non-JSON formats: raw server response is now written directly instead of being re-serialized through `JSON.stringify`.
