import {
  createBranchMergeErrorResponseSchema,
  createBranchMergeQuerySchema,
  createBranchMergeSuccessResponseSchema,
} from "@transi-store/common";
import z from "zod";
import { describeFetchError } from "./fetchProjectMetadata.ts";
import { isMainBranch } from "./git.ts";

const branchMergeQuerySchema = createBranchMergeQuerySchema();
const branchMergeSuccessResponseSchema =
  createBranchMergeSuccessResponseSchema();
const branchMergeErrorResponseSchema = createBranchMergeErrorResponseSchema();

// An empty `--into`, `main` or `master` merges into main, so that a CI can
// always pass the base branch of a pull request.
export function parseMergeTarget(into: string | undefined): string | undefined {
  return into && !isMainBranch(into) ? into : undefined;
}

export type MergeBranchOptions = {
  domainRoot: string;
  apiKey: string;
  org: string;
  project: string;
  branch: string;
  // Slug of the branch to merge into; main when undefined.
  into?: string | undefined;
};

export type MergeBranchResult =
  | {
      ok: true;
      keysMoved: number;
      keysDeleted: number;
      into: string | null;
    }
  | {
      ok: false;
      error: string;
      status?: number;
    };

export function buildMergeBranchUrl({
  domainRoot,
  org,
  project,
  branch,
  into,
}: Pick<
  MergeBranchOptions,
  "domainRoot" | "org" | "project" | "branch" | "into"
>): string {
  const url = `${domainRoot}/api/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(project)}/branches/${encodeURIComponent(branch)}/merge`;

  return into === undefined
    ? url
    : `${url}?${new URLSearchParams({ into }).toString()}`;
}

export async function mergeBranch({
  domainRoot,
  apiKey,
  org,
  project,
  branch,
  into,
}: MergeBranchOptions): Promise<MergeBranchResult> {
  const query = branchMergeQuerySchema.safeParse({ into });
  if (!query.success) {
    return {
      ok: false,
      error: `Invalid --into: ${z.prettifyError(query.error)}`,
    };
  }

  const url = buildMergeBranchUrl({
    domainRoot,
    org,
    project,
    branch,
    into: query.data.into,
  });

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
      into: parsed.data.into,
    };
  }

  const parsedError = branchMergeErrorResponseSchema.safeParse(rawBody);
  const errorMessage = parsedError.success
    ? parsedError.data.error
    : response.statusText;
  return {
    ok: false,
    error: `Failed to merge branch (${response.status} ${response.statusText}): ${errorMessage}`,
    status: response.status,
  };
}

export function describeMergeTarget(into: string | null): string {
  return into === null ? "main" : `branch "${into}"`;
}

export function formatMergeStats({
  keysMoved,
  keysDeleted,
  into,
}: Extract<MergeBranchResult, { ok: true }>): string {
  return into === null
    ? `${keysMoved} keys moved, ${keysDeleted} deleted`
    : `${keysMoved} keys moved, ${keysDeleted} deletions carried over`;
}

export async function mergeBranchCommand(
  options: MergeBranchOptions,
): Promise<void> {
  const result = await mergeBranch(options);

  if (result.ok) {
    console.log(
      `Branch "${options.branch}" merged into ${describeMergeTarget(result.into)} on project "${options.project}": ${formatMergeStats(result)}.`,
    );
    return;
  }

  console.error(result.error);
  process.exit(1);
}
