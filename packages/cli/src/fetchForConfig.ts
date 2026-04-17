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
import { fetchProjectInfo, assertSafePath } from "./fetchProjectFiles.ts";
import { resolveGitBranch } from "./git.ts";

export async function fetchTranslationsAndPrint(config: Config): Promise<void> {
  // Auto-detect branch if not explicitly provided
  const { branch, wasAutoDetected } = await resolveGitBranch(config.branch);
  if (wasAutoDetected && branch) {
    console.log(pc.dim(`Git: auto-detected branch "${branch}"`));
  }
  const resolvedConfig = { ...config, branch };

  const result = await fetchTranslations(resolvedConfig);
  if (result.success) {
    console.log(
      `${pc.green("✓")} ${pc.bold(`${resolvedConfig.project} / ${resolvedConfig.locale}`)} ${pc.dim("→")} ${result.output}`,
    );
  } else {
    console.error(
      `${pc.red("✗")} ${pc.bold(`${resolvedConfig.project} / ${resolvedConfig.locale}`)} — ${pc.red(result.error)}`,
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

type Task = Config & { fileLabel: string };

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

  console.log();
  console.log(pc.bold(pc.cyan("↓ Downloading translations")));
  console.log(pc.dim(`  Domain : ${domainRoot}`));
  console.log(pc.dim(`  Org    : ${result.data.org}`));
  console.log(pc.dim(`  Branch : ${branch ?? pc.italic("(main)")}`));
  console.log();

  const tasks: Task[] = [];
  const projectOrder: string[] = [];
  const labelsByProject = new Map<string, string[]>();

  for (const projectItem of result.data.projects) {
    const projectSlug = projectItem.slug;
    if (!labelsByProject.has(projectSlug)) {
      projectOrder.push(projectSlug);
      labelsByProject.set(projectSlug, []);
    }

    let projectInfo: Awaited<ReturnType<typeof fetchProjectInfo>>;
    try {
      projectInfo = await fetchProjectInfo(
        domainRoot,
        apiKey,
        result.data.org,
        projectSlug,
      );
    } catch (err) {
      console.error(
        pc.red(
          `✗ ${projectSlug}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      process.exit(1);
    }

    const { files, languages } = projectInfo;

    if (files.length === 0) {
      console.warn(
        pc.yellow(`  ⚠ No files configured for project "${projectSlug}"`),
      );
      continue;
    }

    if (languages.length === 0) {
      console.warn(
        pc.yellow(
          `  ⚠ No languages configured for project "${projectSlug}"`,
        ),
      );
      continue;
    }

    for (const file of files) {
      for (const { locale } of languages) {
        const outputTemplate = file.filePath.replace("<lang>", locale);
        const resolvedOutput = path.resolve(cwd, outputTemplate);

        // Security: prevent path traversal
        try {
          assertSafePath(
            resolvedOutput,
            cwd,
            `${projectSlug}/${file.name}/${locale}`,
          );
        } catch (err) {
          console.error(pc.red(String(err)));
          process.exit(1);
        }

        const fileLabel = `${projectSlug}/${file.name}/${locale}`;
        labelsByProject.get(projectSlug)!.push(fileLabel);
        tasks.push({
          domainRoot,
          apiKey,
          org: result.data.org,
          project: projectSlug,
          format: file.format,
          locale,
          output: resolvedOutput,
          branch,
          fileId: file.id,
          fileLabel,
        });
      }
    }
  }

  const total = tasks.length;
  if (total === 0) {
    console.log(pc.yellow("No translation files to download."));
    return;
  }

  let completed = 0;
  const isTTY = process.stdout.isTTY ?? false;

  const resultsMap = new Map<string, Map<string, FetchResult>>();
  for (const project of projectOrder) {
    resultsMap.set(project, new Map());
  }

  if (isTTY) {
    process.stdout.write(renderProgressBar(0, total) + "\r");
  }

  for (let i = 0; i < tasks.length; i += CONCURRENCY_CALLS) {
    await Promise.all(
      tasks.slice(i, i + CONCURRENCY_CALLS).map(async (task) => {
        const fetchResult = await fetchTranslations(task);
        completed++;
        resultsMap.get(task.project)!.set(task.fileLabel, fetchResult);

        if (isTTY) {
          process.stdout.write(renderProgressBar(completed, total) + "\r");
        } else {
          const counter = pc.dim(`[${completed}/${total}]`);
          if (fetchResult.success) {
            console.log(
              `  ${counter} ${pc.green("✓")} ${pc.bold(task.fileLabel)}`,
            );
          } else {
            console.log(
              `  ${counter} ${pc.red("✗")} ${pc.bold(task.fileLabel)} — ${pc.red(fetchResult.error)}`,
            );
          }
        }
      }),
    );
  }

  if (isTTY) {
    process.stdout.write("\r\x1b[K");
  }

  const projectNameLen = Math.max(...projectOrder.map((p) => p.length));
  const failures: Array<{ label: string; error: string }> = [];

  for (const project of projectOrder) {
    const labelResults = resultsMap.get(project)!;
    const name = pc.bold(project.padEnd(projectNameLen + 2));
    const statuses: string[] = [];

    for (const label of labelsByProject.get(project) ?? []) {
      const res = labelResults.get(label);
      if (!res) continue;
      const shortLabel = label.replace(`${project}/`, "");
      if (res.success) {
        statuses.push(pc.green(`✓ ${shortLabel}`));
      } else {
        statuses.push(pc.red(`✗ ${shortLabel}`));
        failures.push({ label, error: res.error });
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
