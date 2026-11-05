export enum ImportStrategy {
  OVERWRITE = "overwrite",
  /**
   * Overwrite the translations of the keys created on the target branch,
   * skip the others. Same as `SKIP` without a branch.
   */
  OVERWRITE_BRANCH = "overwrite-branch",
  SKIP = "skip",
}
