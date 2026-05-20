import { describeFetchError } from "./fetchProjectMetadata.ts";

type MergeBranchOptions = {
  domainRoot: string;
  apiKey: string;
  org: string;
  project: string;
  branch: string;
};

export async function mergeBranchCommand({
  domainRoot,
  apiKey,
  org,
  project,
  branch,
}: MergeBranchOptions): Promise<void> {
  const url = `${domainRoot}/api/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(project)}/branches/${encodeURIComponent(branch)}/merge`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (error) {
    console.error(
      `Failed to merge branch at ${url}: ${describeFetchError(error)}`,
    );
    process.exit(1);
  }

  let data:
    | { keysMoved?: number; keysDeleted?: number; error?: string }
    | null = null;
  try {
    data = await response.json();
  } catch {
    // Empty or non-JSON body — fall back to statusText below.
  }

  if (response.ok) {
    console.log(
      `Branch "${branch}" merged on project "${project}": ${data?.keysMoved ?? 0} keys moved, ${data?.keysDeleted ?? 0} deleted.`,
    );
    return;
  }

  const errorMessage = data?.error ?? response.statusText;
  console.error(
    `Failed to merge branch (${response.status} ${response.statusText}): ${errorMessage}`,
  );
  process.exit(1);
}
