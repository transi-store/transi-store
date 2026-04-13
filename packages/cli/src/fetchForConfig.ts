import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_DOMAIN_ROOT } from "@transi-store/common";
import z from "zod";
import { configSchema } from "@transi-store/common";
import pc from "picocolors";
import {
  fetchTranslations,
  CONCURRENCY_CALLS,
  type Config,
  type FetchResult,
} from "./fetchTranslations.ts";
import { isGitRepository, getCurrentBranch } from "./git.ts";

export async function fetchTranslationsAndPrint(config: Config): Promise<void> {
  const result = await fetchTranslations(config);
  if (result.success) {
    console.log(
      `${pc.green("✓")} ${pc.bold(`${config.project} / ${config.locale}`)} ${pc.dim("→")} ${result.output}`,
    );
  } else {
    console.error(
      `${pc.red("✗")} ${pc.bold(`${config.project} / ${config.locale}`)} — ${pc.red(result.error)}`,
    );
    process.exit(1);
  }
}

function renderProgressBar(completed: number, total: number): string {
  const barWidth = 28;
  const filled =
    total === 0 ? barWidth : Math.round((completed / total) * barWidth);
  const bar =
    pc.green("█".repeat(filled)) + pc.dim("░".repeat(barWidth - filled));
  return `  [${bar}] ${pc.bold(String(completed))}${pc.dim(`/${total}`)}`;
}

export async function fetchForConfig(
  configPath: string,
  apiKey: string,
  branch?: string,
): Promise<void> {
  const cwd = process.cwd();

  const fullPath = path.resolve(cwd, configPath);

  if (!fs.existsSync(fullPath)) {
    console.error(pc.red(`Config file not found: ${configPath}`));
    process.exit(1);
  }

  const config = (
    await import(pathToFileURL(fullPath).href, { with: { type: "json" } })
  ).default;
  const result = configSchema.safeParse(config);

  if (!result.success) {
    const pretty = z.prettifyError(result.error);
    console.error(pc.red("Config validation error:"), pretty);
    process.exit(1);
  }

  const domainRoot = result.data.domainRoot ?? DEFAULT_DOMAIN_ROOT;

  // Auto-detect current git branch if not explicitly provided
  let resolvedBranch = branch;
  if (!resolvedBranch && (await isGitRepository())) {
    const currentBranch = await getCurrentBranch();
    if (currentBranch) {
      resolvedBranch = currentBranch;
    }
  }
  const wasAutoDetected = !branch && !!resolvedBranch;

  let branchLabel: string;
  if (resolvedBranch) {
    branchLabel = wasAutoDetected
      ? `${resolvedBranch}${pc.italic(" (auto-detected)")}`
      : resolvedBranch;
  } else {
    branchLabel = pc.italic("(main)");
  }

  console.log();
  console.log(pc.bold(pc.cyan("↓ Downloading translations")));
  console.log(pc.dim(`  Domain : ${domainRoot}`));
  console.log(pc.dim(`  Org    : ${result.data.org}`));
  console.log(pc.dim(`  Branch : ${branchLabel}`));
  console.log();

  // Build tasks, preserving project and locale order from config
  const tasks: Config[] = [];
  const projectOrder: string[] = [];
  const localesByProject = new Map<string, string[]>();

  for (const configItem of result.data.projects) {
    if (!localesByProject.has(configItem.project)) {
      projectOrder.push(configItem.project);
      localesByProject.set(configItem.project, []);
    }
    for (const locale of configItem.langs) {
      localesByProject.get(configItem.project)!.push(locale);
      tasks.push({
        domainRoot,
        apiKey,
        org: result.data.org,
        project: configItem.project,
        format: configItem.format,
        locale,
        output: configItem.output
          .replace("<lang>", locale)
          .replace("<project>", configItem.project)
          .replace("<format>", configItem.format),
        branch: resolvedBranch,
      });
    }
  }

  const total = tasks.length;
  let completed = 0;
  const isTTY = process.stdout.isTTY ?? false;

  // results[project][locale] = FetchResult
  const resultsMap = new Map<string, Map<string, FetchResult>>();
  for (const project of projectOrder) {
    resultsMap.set(project, new Map());
  }

  if (isTTY) {
    process.stdout.write(renderProgressBar(0, total) + "\r");
  }

  // Limit concurrent HTTP requests to avoid overwhelming the server
  for (let i = 0; i < tasks.length; i += CONCURRENCY_CALLS) {
    await Promise.all(
      tasks.slice(i, i + CONCURRENCY_CALLS).map(async (task) => {
        const fetchResult = await fetchTranslations(task);
        completed++;
        resultsMap.get(task.project)!.set(task.locale, fetchResult);

        if (isTTY) {
          process.stdout.write(renderProgressBar(completed, total) + "\r");
        } else {
          // Non-TTY (CI): print each result on its own line
          const counter = pc.dim(`[${completed}/${total}]`);
          if (fetchResult.success) {
            console.log(
              `  ${counter} ${pc.green("✓")} ${pc.bold(`${task.project} / ${task.locale}`)}`,
            );
          } else {
            console.log(
              `  ${counter} ${pc.red("✗")} ${pc.bold(`${task.project} / ${task.locale}`)} — ${pc.red(fetchResult.error)}`,
            );
          }
        }
      }),
    );
  }

  if (isTTY) {
    // Clear the progress bar line
    process.stdout.write("\r\x1b[K");
  }

  // Display grouped results table
  const projectNameLen = Math.max(...projectOrder.map((p) => p.length));
  const failures: Array<{ label: string; error: string }> = [];

  for (const project of projectOrder) {
    const localeResults = resultsMap.get(project)!;
    const name = pc.bold(project.padEnd(projectNameLen + 2));
    const statuses: string[] = [];

    for (const locale of localesByProject.get(project)!) {
      const res = localeResults.get(locale);
      if (!res) continue;
      if (res.success) {
        statuses.push(pc.green(`✓ ${locale}`));
      } else {
        statuses.push(pc.red(`✗ ${locale}`));
        failures.push({ label: `${project} / ${locale}`, error: res.error });
      }
    }

    console.log(`  ${name}${statuses.join(pc.dim("  "))}`);
  }

  console.log();

  const succeeded = total - failures.length;
  if (failures.length === 0) {
    console.log(
      pc.green(
        pc.bold(
          `✓ All ${total} translation${total > 1 ? "s" : ""} downloaded successfully`,
        ),
      ),
    );
  } else {
    if (succeeded > 0) {
      console.log(
        pc.green(
          `✓ ${succeeded} translation${succeeded > 1 ? "s" : ""} downloaded`,
        ),
      );
    }
    console.log(pc.red(pc.bold(`✗ ${failures.length} failed:`)));
    for (const failure of failures) {
      console.log(pc.red(`    · ${failure.label}: ${failure.error}`));
    }
    console.log();
    process.exit(1);
  }

  console.log();
}
