import { simpleGit, type SimpleGit } from "simple-git";

let gitInstance: SimpleGit | undefined;

function getGit(): SimpleGit {
  if (!gitInstance) {
    gitInstance = simpleGit();
  }
  return gitInstance;
}

export async function isGitRepository(): Promise<boolean> {
  try {
    return await getGit().checkIsRepo();
  } catch {
    return false;
  }
}

/**
 * Detect the default branch (main/master) with remote or local ref.
 * Returns null if not found.
 */
export async function getDefaultBranch(): Promise<string | null> {
  const git = getGit();

  // Check remote branches
  try {
    const branches = await git.branch(["-r"]);
    if (branches.all.includes("origin/main")) return "origin/main";
    if (branches.all.includes("origin/master")) return "origin/master";
  } catch {
    // ignore
  }

  // Fallback to local branches
  try {
    const branches = await git.branchLocal();
    if (branches.all.includes("main")) return "main";
    if (branches.all.includes("master")) return "master";
  } catch {
    // ignore
  }

  return null;
}

export async function getCurrentBranch(): Promise<string | null> {
  try {
    const { current } = await getGit().branchLocal();
    return current || null;
  } catch {
    return null;
  }
}

/**
 * Returns the set of absolute paths of files that have been modified
 * compared to the given base branch, including untracked files.
 */
export async function getModifiedFiles(
  baseBranch: string,
): Promise<Set<string>> {
  const git = getGit();

  const repoRoot = (await git.revparse(["--show-toplevel"])).trim();

  // Files that differ from base branch (committed + staged + unstaged changes)
  const diff = await git.diff(["--name-only", baseBranch]);
  const diffFiles = diff.trim().split("\n").filter(Boolean);

  // Untracked files (not in git at all)
  const status = await git.status();

  const modified = new Set<string>();
  for (const f of [...diffFiles, ...status.not_added]) {
    modified.add(`${repoRoot}/${f}`);
  }

  return modified;
}

/**
 * Returns the set of absolute paths of files that have been modified
 * in the last commit (HEAD vs HEAD~1).
 * Returns null if the comparison is not possible (e.g. initial commit).
 */
export async function getModifiedFilesFromLastCommit(): Promise<Set<string> | null> {
  const git = getGit();

  try {
    const repoRoot = (await git.revparse(["--show-toplevel"])).trim();

    const diff = await git.diff(["--name-only", "HEAD~1", "HEAD"]);
    const diffFiles = diff.trim().split("\n").filter(Boolean);

    const modified = new Set<string>();
    for (const f of diffFiles) {
      modified.add(`${repoRoot}/${f}`);
    }

    return modified;
  } catch {
    // HEAD~1 may not exist (initial commit)
    return null;
  }
}
