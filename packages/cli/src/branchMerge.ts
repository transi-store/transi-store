import { describeFetchError } from "./fetchProjectMetadata.ts";

export type MergeBranchOptions = {
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
  const url = `${domainRoot}/api/orgs/${org}/projects/${project}/branches/${branch}/merge`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Length": "0",
      },
    });
  } catch (error) {
    console.error(
      `Failed to merge branch at ${url}: ${describeFetchError(error)}`,
    );
    process.exit(1);
  }

  const body = await response.text();
  let data: unknown = null;
  if (body.length > 0) {
    try {
      data = JSON.parse(body);
    } catch {
      // Non-JSON body — keep raw text for diagnostics
    }
  }

  if (response.ok) {
    const stats = data as { keysMoved?: number; keysDeleted?: number } | null;
    console.log(
      `Branch "${branch}" merged on project "${project}": ${stats?.keysMoved ?? 0} keys moved, ${stats?.keysDeleted ?? 0} deleted.`,
    );
    return;
  }

  if (response.status === 409) {
    const conflict = data as {
      error?: string;
      conflictingKeys?: string[];
    } | null;
    console.error(
      `Merge conflict: ${conflict?.error ?? "Conflicting keys exist on main"}`,
    );
    for (const key of conflict?.conflictingKeys ?? []) {
      console.error(`  - ${key}`);
    }
    process.exit(1);
  }

  const errorFromData = (data as { error?: string } | null)?.error;
  const errorMessage =
    errorFromData ?? (body.trim() || response.statusText);
  console.error(
    `Failed to merge branch (${response.status} ${response.statusText}): ${errorMessage}`,
  );
  process.exit(1);
}
