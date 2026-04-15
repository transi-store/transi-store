# CHANGELOG

## 1.8.4

### Patch Changes

- Test new release script

## 1.8.3

### Patch Changes

- Change release script

## 1.8.2

### Patch Changes

- Fix release script

## 1.8.1

### Patch Changes

- Fix cli repository url in package.json

## 1.8.0

### Minor Changes

- [#130](https://github.com/transi-store/transi-store/pull/130) [`72eaf59`](https://github.com/transi-store/transi-store/commit/72eaf59deb19d936eaeff85c3be99e9fc0a6b2e9) Thanks [@jdeniau](https://github.com/jdeniau)! - Use changesets to release packages

## Unreleased

## 1.7.0

### Added

- `download`, `download:config`, `upload:config` commands now automatically detect and use the current git branch when `--branch` is not explicitly provided. If you are on a feature branch, translations will be fetched for that branch without any extra flags.

### Fixed

- Git optimization for `upload:config` now always compares the full branch against the default branch (main/master). Previously, the optimization only worked on feature branches with full git history available. Now it also fetches `origin/main` when not locally available (e.g. CI shallow clones).
- fix: skip empty string translations during import [#111](https://github.com/transi-store/transi-store/pull/111)

## 1.6.0

### Changed

- improve download command output [#109](https://github.com/transi-store/transi-store/pull/109)

## 1.5.2

### Fixed

- Limit http calls with cli #108

## 1.5.1

### Fixed

Fix broken link on common package.

## 1.5.0

### Added

- Accept `--branch=@all` in CLI to download translations from all branches.

## 1.4.0

### Added

- Skip unchanged files in `upload:config` when running on a git feature branch (compares to main branch).

## 1.3.0

### Added

- Added `upload:config` command to CLI to upload translations based on a config file.
- Added `--branch` option to CLI in "download:config" mode.

## 1.2.0

### Added

- Added `--branch` option to CLI to specify branch slug for fetching translations. ([#72](https://github.com/transi-store/transi-store/pull/72))
