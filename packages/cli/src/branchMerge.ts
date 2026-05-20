import { describeFetchError } from "./fetchProjectMetadata.ts";

export type MergeBranchOptions = {
  domainRoot: string;
  apiKey: string;
  org: string;
  project: string;
  branch: string;
};

export type MergeBranchResult =
  | {
      ok: true;
      keysMoved: number;
      keysDeleted: number;
    }
  | {
      ok: false;
      error: string;
    };

type MergeApiResponse = {
  keysMoved?: number;
  keysDeleted?: number;
  error?: string;
};

export function buildMergeBranchUrl({
  domainRoot,
  org,
  project,
  branch,
}: Pick<
  MergeBranchOptions,
  "domainRoot" | "org" | "project" | "branch"
>): string {
  return `${domainRoot}/api/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(project)}/branches/${encodeURIComponent(branch)}/merge`;
}

export async function mergeBranch({
  domainRoot,
  apiKey,
  org,
  project,
  branch,
}: MergeBranchOptions): Promise<MergeBranchResult> {
  const url = buildMergeBranchUrl({ domainRoot, org, project, branch });

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (error) {
    return {
      ok: false,
      error: `Failed to merge branch at ${url}: ${describeFetchError(error)}`,
    };
  }

  let data: MergeApiResponse | null = null;
  try {
    data = (await response.json()) as MergeApiResponse;
  } catch {
    // Empty or non-JSON body — fall back to statusText below.
  }

  if (response.ok) {
    return {
      ok: true,
      keysMoved: data?.keysMoved ?? 0,
      keysDeleted: data?.keysDeleted ?? 0,
    };
  }

  const errorMessage = data?.error ?? response.statusText;
  return {
    ok: false,
    error: `Failed to merge branch (${response.status} ${response.statusText}): ${errorMessage}`,
  };
}

export async function mergeBranchCommand(
  options: MergeBranchOptions,
): Promise<void> {
  const result = await mergeBranch(options);

  if (result.ok) {
    console.log(
      `Branch "${options.branch}" merged on project "${options.project}": ${result.keysMoved} keys moved, ${result.keysDeleted} deleted.`,
    );
    return;
  }

  console.error(result.error);
  process.exit(1);
}
