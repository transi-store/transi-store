import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { styleText } from "node:util";
import { DEFAULT_DOMAIN_ROOT, configSchema } from "@transi-store/common";
import z from "zod";
import { mergeBranch, type MergeBranchResult } from "./branchMerge.ts";

type MergeForConfigDeps = {
  readConfig?: (configPath: string) => Promise<unknown>;
  merge?: typeof mergeBranch;
};

type ProjectResult = {
  project: string;
  result: MergeBranchResult;
};

type MergeForConfigSummary = {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: Array<ProjectResult>;
};

async function defaultReadConfig(configPath: string): Promise<unknown> {
  const cwd = process.cwd();
  const fullPath = path.resolve(cwd, configPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  return (
    await import(pathToFileURL(fullPath).href, { with: { type: "json" } })
  ).default;
}

/**
 * Runs the branch merge for every project declared in the config file.
 * Returns a summary so callers (CLI or tests) can render or assert the result.
 */
export async function runMergeForConfig(
  configPath: string,
  apiKey: string,
  branch: string,
  deps: MergeForConfigDeps = {},
): Promise<MergeForConfigSummary> {
  const readConfig = deps.readConfig ?? defaultReadConfig;
  const merge = deps.merge ?? mergeBranch;

  const config = await readConfig(configPath);
  const parsed = configSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Config validation error: ${z.prettifyError(parsed.error)}`,
    );
  }

  const domainRoot = parsed.data.domainRoot ?? DEFAULT_DOMAIN_ROOT;

  const results: Array<ProjectResult> = [];
  for (const item of parsed.data.projects) {
    const result = await merge({
      domainRoot,
      apiKey,
      org: parsed.data.org,
      project: item.project,
      branch,
    });
    results.push({ project: item.project, result });
  }

  const succeeded = results.filter((r) => r.result.ok).length;
  const skipped = results.filter(
    (r) => !r.result.ok && r.result.reason === "not_found",
  ).length;
  return {
    total: results.length,
    succeeded,
    skipped,
    failed: results.length - succeeded - skipped,
    results,
  };
}

export async function mergeForConfig(
  configPath: string,
  apiKey: string,
  branch: string,
): Promise<void> {
  let summary: MergeForConfigSummary;
  try {
    summary = await runMergeForConfig(configPath, apiKey, branch);
  } catch (error) {
    console.error(
      styleText("red", error instanceof Error ? error.message : String(error)),
    );
    process.exit(1);
  }

  console.log();
  console.log(styleText(["bold", "cyan"], "↳ Merging translation branch"));
  console.log(styleText("dim", `  Branch : ${branch}`));
  console.log();

  for (const { project, result } of summary.results) {
    if (result.ok) {
      console.log(
        `  ${styleText("green", "✓")} ${styleText("bold", project)} ${styleText(
          "dim",
          `→ ${result.keysMoved} keys moved, ${result.keysDeleted} deleted`,
        )}`,
      );
    } else if (result.reason === "not_found") {
      console.log(
        `  ${styleText("dim", "-")} ${styleText("bold", project)} — ${styleText(
          "dim",
          "branch not found (skipped)",
        )}`,
      );
    } else {
      console.log(
        `  ${styleText("red", "✗")} ${styleText("bold", project)} — ${styleText(
          "red",
          result.error,
        )}`,
      );
    }
  }

  console.log();
  if (summary.failed === 0) {
    console.log(
      styleText(
        ["green", "bold"],
        `✓ Branch "${branch}": ${summary.succeeded} project${summary.succeeded > 1 ? "s" : ""} merged${summary.skipped > 0 ? `, ${summary.skipped} skipped` : ""}`,
      ),
    );
  } else {
    console.log(
      styleText(
        ["red", "bold"],
        `✗ ${summary.failed} of ${summary.total} project${summary.total > 1 ? "s" : ""} failed`,
      ),
    );
    process.exit(1);
  }
}
