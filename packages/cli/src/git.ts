import { simpleGit, type SimpleGit } from "simple-git";

let gitInstance: SimpleGit | undefined;

enum MainBranch {
  MAIN = "main",
  MASTER = "master",
}

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
 * If not found locally, tries to fetch it from origin.
 * Returns null if not found.
 */
export async function getDefaultBranch(): Promise<string | null> {
  const git = getGit();

  // Check remote branches
  try {
    const branches = await git.branch(["-r"]);
    if (branches.all.includes(`origin/${MainBranch.MAIN}`)) {
      return `origin/${MainBranch.MAIN}`;
    }
    if (branches.all.includes(`origin/${MainBranch.MASTER}`)) {
      return `origin/${MainBranch.MASTER}`;
    }
  } catch {
    // ignore
  }

  // Remote refs not available (e.g. shallow clone in CI) — try to fetch
  for (const branch of [MainBranch.MAIN, MainBranch.MASTER]) {
    try {
      await git.fetch(["origin", branch]);
      return `origin/${branch}`;
    } catch {
      // branch doesn't exist on remote, try next
    }
  }

  // Fallback to local branches
  try {
    const branches = await git.branchLocal();
    if (branches.all.includes(MainBranch.MAIN)) {
      return MainBranch.MAIN;
    }
    if (branches.all.includes(MainBranch.MASTER)) {
      return MainBranch.MASTER;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Returns the current git branch name, or null if:
 * - in detached HEAD state
 * - on the default branch (main/master) — no branch slug needed for download
 */
async function getCurrentBranch(): Promise<MainBranch | string | null> {
  try {
    const git = getGit();
    const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
    const name = branch.trim();

    if (!name || name === "HEAD") {
      return null;
    }

    return name;
  } catch {
    return null;
  }
}

type ResolvedBranch = {
  /** The resolved branch slug, or undefined when on main/master or outside a git repo. */
  branch: string | undefined;
  /** True when the branch was resolved automatically (not explicitly provided by the caller). */
  wasAutoDetected: boolean;
  /** True when the branch is the main branch (main/master). */
  isMainBranch?: boolean;
};

function isMainBranch(branch: string | undefined): branch is MainBranch {
  return (Object.values(MainBranch) as Array<string | undefined>).includes(
    branch,
  );
}

/**
 * Resolves the branch to use for API calls.
 * - If `explicitBranch` is provided, it is used as-is.
 * - Otherwise the current git branch is detected; main/master/detached HEAD resolve to undefined.
 */
export async function resolveGitBranch(
  explicitBranch?: string,
): Promise<ResolvedBranch> {
  if (explicitBranch) {
    return {
      branch: explicitBranch,
      wasAutoDetected: false,
      isMainBranch: isMainBranch(explicitBranch),
    };
  }

  if (await isGitRepository()) {
    const currentBranch = await getCurrentBranch();

    if (currentBranch) {
      return {
        branch: currentBranch,
        wasAutoDetected: true,
        isMainBranch: isMainBranch(currentBranch),
      };
    }
  }

  return { branch: undefined, wasAutoDetected: false, isMainBranch: false };
}

/**
 * Returns the set of absolute paths of files that have been modified
 * compared to the given base ref, including untracked files.
 */
export async function getModifiedFiles(baseRef: string): Promise<Set<string>> {
  const git = getGit();

  const repoRoot = (await git.revparse(["--show-toplevel"])).trim();

  // Files that differ from base ref (committed + staged + unstaged changes)
  const diff = await git.diff(["--name-only", baseRef]);
  const diffFiles = diff.trim().split("\n").filter(Boolean);

  // Untracked files (not in git at all)
  const status = await git.status();

  const modified = new Set<string>();
  for (const f of [...diffFiles, ...status.not_added]) {
    modified.add(`${repoRoot}/${f}`);
  }

  return modified;
}
