import {
  createBranchMergeErrorResponseSchema,
  createBranchMergeSuccessResponseSchema,
} from "@transi-store/common";
import { describeFetchError } from "./fetchProjectMetadata.ts";

const branchMergeSuccessResponseSchema =
  createBranchMergeSuccessResponseSchema();
const branchMergeErrorResponseSchema = createBranchMergeErrorResponseSchema();

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
      reason?: "not_found" | "not_open";
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

  let rawBody: unknown = null;
  try {
    rawBody = await response.json();
  } catch {
    // Empty or non-JSON body — fall back to statusText below.
  }

  if (response.ok) {
    const parsed = branchMergeSuccessResponseSchema.safeParse(rawBody);
    if (!parsed.success) {
      return {
        ok: false,
        error: `Unexpected response from merge endpoint: ${parsed.error.message}`,
      };
    }
    return {
      ok: true,
      keysMoved: parsed.data.keysMoved,
      keysDeleted: parsed.data.keysDeleted,
    };
  }

  const parsedError = branchMergeErrorResponseSchema.safeParse(rawBody);
  const errorMessage = parsedError.success
    ? parsedError.data.error
    : response.statusText;
  return {
    ok: false,
    error: `Failed to merge branch (${response.status} ${response.statusText}): ${errorMessage}`,
    ...(parsedError.success && parsedError.data.reason
      ? { reason: parsedError.data.reason }
      : {}),
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
