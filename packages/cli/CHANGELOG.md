# CHANGELOG

## 2.1.0

### Minor Changes

- [#148](https://github.com/transi-store/transi-store/pull/148) [`397d433`](https://github.com/transi-store/transi-store/commit/397d433b177db9e136ad2a760f445030b99d88af) Thanks [@jdeniau](https://github.com/jdeniau)! - Handle master/main branch differently : on upload, push all keys

## 2.0.0

### Major Changes

- [`d170fd5`](https://github.com/transi-store/transi-store/commit/d170fd59239c7bc62045cddf233f53488ec4d35b) Thanks [@jdeniau](https://github.com/jdeniau)! - Handle multiple files per project

  CLI config drops output, format, langs; the CLI fetches project metadata, iterates files × languages, and logs the file name alongside project/locale. Direct download/upload drop --output/--format and gain --file <id> for multi-file projects.

### Upgrading

Just remove the `output`, `format` and `languages` options from your CLI config file. Be sure to update your project configuration in the Transi Store dashboard though to have the same languages and file paths.

```diff
  {
    "$schema": "https://unpkg.com/@transi-store/cli/schema.json",
    "org": "transi-store",
    "projects": [
      {
        "project": "website",
-       "langs": ["en", "fr", "es", "de"],
-       "format": "json",
-       "output": "apps/website/app/locales/<lang>/translation.json"
      }
    ]
  }
```

Example in the transi-store repository migration: https://github.com/transi-store/transi-store/commit/db38bf2b60b6475f56af0ad0a346444a3c2ab973#diff-13a08b445488fcd0c1005324ddd43e08dd3147a7a9bd82938721bb66aec7d0c9

## 1.9.0

### Minor Changes

- [#116](https://github.com/transi-store/transi-store/pull/116) [`e5d9103`](https://github.com/transi-store/transi-store/commit/e5d9103108309014fb32d8e5fc8248557bdd4a3b) Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)!

### Added

- Support for YAML, CSV, PO, INI, and PHP translation formats in `download` and `upload` commands.

### Fixed

- Fix export for non-JSON formats: raw server response is now written directly instead of being re-serialized through `JSON.stringify`.

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
