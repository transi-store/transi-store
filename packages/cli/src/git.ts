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
