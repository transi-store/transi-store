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

  // Try symbolic ref from origin
  try {
    const ref = await git.raw("symbolic-ref", "refs/remotes/origin/HEAD");
    // refs/remotes/origin/main → origin/main
    return ref.trim().replace("refs/remotes/", "");
  } catch {
    // ignore
  }

  // Try common remote branch names
  for (const branch of ["origin/main", "origin/master"]) {
    try {
      await git.raw("rev-parse", "--verify", branch);
      return branch;
    } catch {
      continue;
    }
  }

  // Try local branch names
  for (const branch of ["main", "master"]) {
    try {
      await git.raw("rev-parse", "--verify", branch);
      return branch;
    } catch {
      continue;
    }
  }

  return null;
}

export async function getCurrentBranch(): Promise<string | null> {
  try {
    const branch = await getGit().revparse(["--abbrev-ref", "HEAD"]);
    return branch.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Check if a file has been modified compared to a base branch.
 * Untracked files are considered modified (should be uploaded).
 */
export async function isFileModifiedComparedTo(
  filePath: string,
  baseBranch: string,
): Promise<boolean> {
  const git = getGit();

  try {
    // Check if file is tracked by git
    const lsOutput = await git.raw("ls-files", "--", filePath);

    if (!lsOutput.trim()) {
      // File is untracked → should be uploaded
      return true;
    }

    // Check if file differs from base branch
    const diff = await git.diff(["--name-only", baseBranch, "--", filePath]);
    return diff.trim().length > 0;
  } catch {
    // If anything fails, upload to be safe
    return true;
  }
}
