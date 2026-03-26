# CHANGELOG

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
