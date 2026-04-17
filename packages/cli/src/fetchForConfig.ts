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
import {
  fetchProjectFiles,
  assertSafePath,
} from "./fetchProjectFiles.ts";
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

async function fetchProjectLanguages(
  domainRoot: string,
  apiKey: string,
  org: string,
  projectSlug: string,
): Promise<string[]> {
  const url = `${domainRoot}/api/orgs/${org}/projects/${projectSlug}/languages`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to fetch languages for "${projectSlug}": ${response.status} ${response.statusText}${(body as { error?: string }).error ? ` — ${(body as { error?: string }).error}` : ""}`,
    );
  }

  const data = (await response.json()) as Array<{ locale: string }>;
  return data.map((l) => l.locale);
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

    let files: Awaited<ReturnType<typeof fetchProjectFiles>>;
    let langs: string[];
    try {
      [files, langs] = await Promise.all([
        fetchProjectFiles(domainRoot, apiKey, result.data.org, projectSlug),
        fetchProjectLanguages(domainRoot, apiKey, result.data.org, projectSlug),
      ]);
    } catch (err) {
      console.error(
        pc.red(
          `✗ ${projectSlug}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      process.exit(1);
    }

    if (files.length === 0) {
      console.warn(
        pc.yellow(`  ⚠ No files configured for project "${projectSlug}"`),
      );
      continue;
    }

    if (langs.length === 0) {
      console.warn(
        pc.yellow(
          `  ⚠ No languages configured for project "${projectSlug}"`,
        ),
      );
      continue;
    }

    for (const file of files) {
      for (const locale of langs) {
        const outputTemplate = file.output.replace("<lang>", locale);
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

  console.log();
  console.log(pc.bold(pc.cyan("↓ Downloading translations")));
  console.log(pc.dim(`  Domain : ${domainRoot}`));
  console.log(pc.dim(`  Org    : ${result.data.org}`));
  console.log(pc.dim(`  Branch : ${branch ?? pc.italic("(main)")}`));
  console.log();

  // For each project: fetch the file list from the API, then download all locale files
  type Task = Config & { fileLabel: string };
  const tasks: Task[] = [];

  // project slug → list of file labels
  const projectOrder: string[] = [];
  const labelsByProject = new Map<string, string[]>();

  for (const projectItem of result.data.projects) {
    const projectSlug = projectItem.slug;
    if (!labelsByProject.has(projectSlug)) {
      projectOrder.push(projectSlug);
      labelsByProject.set(projectSlug, []);
    }

    let files: ProjectFileInfo[];
    try {
      files = await fetchProjectFiles(
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

    if (files.length === 0) {
      console.warn(
        pc.yellow(`  ⚠ No files configured for project "${projectSlug}"`),
      );
      continue;
    }

    // Fetch project languages from the translations API (locale list comes from project files via API)
    // We need the langs — fetch them from the first export call to discover available locales.
    // Since the API /files returns `output` and `format` but not langs, we need to fetch langs separately.
    // Use the existing languages endpoint indirectly: we'll fetch each output path per locale.
    // For simplicity, we discover locales by fetching project languages via /files response + a dedicated call.
    // Actually the /files endpoint doesn't return langs. We need to get them from project settings.
    // We'll read them from the export API — but that requires knowing the locale.
    // Instead, we'll add a simple langs fetch via the translations endpoint with a probe.
    // The simplest approach: derive langs from projectLanguages API.
    // Since we don't have a dedicated /languages endpoint yet, we'll discover them by trying the /files info.
    //
    // WORKAROUND: Fetch project languages via undocumented call to the export endpoint to get a 400 with available locales.
    // Better approach: add /languages endpoint — but for now, use a dedicated call.
    //
    // For now, we'll fetch langs by calling a known endpoint that returns them in error.
    // INSTEAD: let's just call /api/orgs/:org/projects/:project/translations?format=json&locale=__probe
    // to get the list of available locales from the 400 response message.
    //
    // Actually, cleanest approach: fetch project languages via a call similar to what the UI does.
    // We can reuse the /files endpoint and the translations endpoint. Let's add langs to the /files endpoint.
    // But that requires schema changes... We'll do a simpler approach:
    // Fetch the project languages from a new endpoint.
    //
    // For now: add an undocumented "langs" field to the /files endpoint response.
    // This requires updating the server endpoint to include langs.
    //
    // Actually the cleanest solution for the CLI is to include langs in the /files API response.
    // Let me just include the project languages in the /files response.
    // See: the /files route fetches getProjectFiles() which returns files only.
    // I need to also return project languages in the API response.
    //
    // For now let me make the CLI fetch project langs separately.
    // I'll add a simple undocumented /api/orgs/:orgSlug/projects/:projectSlug/langs endpoint,
    // or better, I'll include the langs in the /files response.
    //
    // DECISION: Include project langs in /files response (server-side update needed).
    // Since I'm here, I'll instead use the existing translations endpoint:
    // Probe with ?format=json&locale=INVALID to get 400 with list of available locales.
    // This is too hacky. Let me just update the /files endpoint to also return project langs.

    // For now, use a separate lang fetch:
    const langs = await fetchProjectLanguages(domainRoot, apiKey, result.data.org, projectSlug);

    for (const file of files) {
      for (const locale of langs) {
        const output = file.output.replace("<lang>", locale);
        const resolvedOutput = path.resolve(cwd, output);

        // Security: prevent path traversal
        try {
          assertSafePath(resolvedOutput, cwd, `${projectSlug}/${file.name}/${locale}`);
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
          fileLabel,
          fileId: file.id,
        } as Task);
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

  // results[project][fileLabel] = FetchResult
  const resultsMap = new Map<string, Map<string, FetchResult>>();
  for (const project of projectOrder) {
    resultsMap.set(project, new Map());
  }

  if (isTTY) {
    process.stdout.write(renderProgressBar(0, total) + "\r");
  }

  // Limit concurrent HTTP requests
  for (let i = 0; i < tasks.length; i += CONCURRENCY_CALLS) {
    await Promise.all(
      tasks.slice(i, i + CONCURRENCY_CALLS).map(async (task) => {
        const fetchResult = await fetchTranslations({
          ...task,
          output: task.output,
        });
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

  // Display grouped results
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

/**
 * Fetch the list of locales configured for a project.
 * Uses the /api/orgs/:org/projects/:project/files endpoint
 * (which now includes langs in the response).
 */
async function fetchProjectLanguages(
  domainRoot: string,
  apiKey: string,
  org: string,
  projectSlug: string,
): Promise<string[]> {
  const url = `${domainRoot}/api/orgs/${org}/projects/${projectSlug}/languages`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to fetch languages for project "${projectSlug}": ${response.status} ${response.statusText}${body.error ? ` — ${body.error}` : ""}`,
    );
  }

  const data = (await response.json()) as Array<{ locale: string }>;
  return data.map((l) => l.locale);
}


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
  const { branch: resolvedBranch, wasAutoDetected } =
    await resolveGitBranch(branch);

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
