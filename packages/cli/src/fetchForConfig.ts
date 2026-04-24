import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { styleText } from "node:util";
import { DEFAULT_DOMAIN_ROOT } from "@transi-store/common";
import z from "zod";
import { configSchema } from "@transi-store/common";
import {
  fetchTranslations,
  CONCURRENCY_CALLS,
  type Config,
  type FetchResult,
} from "./fetchTranslations.ts";
import { fetchProjectMetadata } from "./fetchProjectMetadata.ts";
import { pickFile, resolveFilePath } from "./fileHelper.ts";
import { resolveGitBranch } from "./git.ts";

export type DownloadOneOptions = {
  domainRoot: string;
  apiKey: string;
  org: string;
  project: string;
  locale: string;
  fileId?: string | undefined;
  branch?: string | undefined;
};

type TaskLabel = {
  project: string;
  fileName: string;
  locale: string;
};

// Direct download flow used by the `download` CLI command. Fetches the
// project's metadata, selects the file to download, then delegates to
// fetchTranslationsAndPrint.
export async function downloadOne(options: DownloadOneOptions): Promise<void> {
  const metadata = await fetchProjectMetadata({
    domainRoot: options.domainRoot,
    apiKey: options.apiKey,
    org: options.org,
    project: options.project,
  });
  const file = pickFile(metadata.files, options.fileId, options.project);

  await fetchTranslationsAndPrint(
    {
      domainRoot: options.domainRoot,
      apiKey: options.apiKey,
      org: options.org,
      project: options.project,
      fileId: file.id,
      format: file.format,
      locale: options.locale,
      output: resolveFilePath(file.filePath, options.locale),
      branch: options.branch,
    },
    {
      project: options.project,
      fileName: file.filePath,
      locale: options.locale,
    },
  );
}

async function fetchTranslationsAndPrint(
  config: Config,
  label?: TaskLabel,
): Promise<void> {
  const { branch, wasAutoDetected } = await resolveGitBranch(config.branch);
  if (wasAutoDetected && branch) {
    console.log(styleText("dim", `Git: auto-detected branch "${branch}"`));
  }
  const resolvedConfig = { ...config, branch };

  const result = await fetchTranslations(resolvedConfig);
  const name = label
    ? `${label.project} / ${label.fileName} / ${label.locale}`
    : `${config.project} / ${config.locale}`;

  if (result.success) {
    console.log(
      `${styleText("green", "✓")} ${styleText("bold", name)} ${styleText("dim", "→")} ${result.output}`,
    );
  } else if ("skipped" in result) {
    console.log(
      `${styleText("dim", "-")} ${styleText("bold", name)} — ${styleText("dim", "no translations")}`,
    );
  } else {
    console.error(
      `${styleText("red", "✗")} ${styleText("bold", name)} — ${styleText("red", result.error)}`,
    );
    process.exit(1);
  }
}

function renderProgressBar(completed: number, total: number): string {
  const barWidth = 28;
  const filled =
    total === 0 ? barWidth : Math.round((completed / total) * barWidth);
  const bar =
    styleText("green", "█".repeat(filled)) +
    styleText("dim", "░".repeat(barWidth - filled));
  return `  [${bar}] ${styleText("bold", String(completed))}${styleText("dim", `/${total}`)}`;
}

type Task = Config & { fileName: string };

export async function fetchForConfig(
  configPath: string,
  apiKey: string,
  branch?: string,
): Promise<void> {
  const cwd = process.cwd();

  const fullPath = path.resolve(cwd, configPath);

  if (!fs.existsSync(fullPath)) {
    console.error(styleText("red", `Config file not found: ${configPath}`));
    process.exit(1);
  }

  const config = (
    await import(pathToFileURL(fullPath).href, { with: { type: "json" } })
  ).default;
  const result = configSchema.safeParse(config);

  if (!result.success) {
    const pretty = z.prettifyError(result.error);
    console.error(styleText("red", "Config validation error:"), pretty);
    process.exit(1);
  }

  const domainRoot = result.data.domainRoot ?? DEFAULT_DOMAIN_ROOT;

  const { branch: resolvedBranch, wasAutoDetected } =
    await resolveGitBranch(branch);

  let branchLabel: string;
  if (resolvedBranch) {
    branchLabel = wasAutoDetected
      ? `${resolvedBranch}${styleText("italic", " (auto-detected)")}`
      : resolvedBranch;
  } else {
    branchLabel = styleText("italic", "(main)");
  }

  console.log();
  console.log(styleText(["bold", "cyan"], "↓ Downloading translations"));
  console.log(styleText("dim", `  Domain : ${domainRoot}`));
  console.log(styleText("dim", `  Org    : ${result.data.org}`));
  console.log(styleText("dim", `  Branch : ${branchLabel}`));
  console.log();

  // Build tasks by fetching metadata for each project.
  const tasks: Task[] = [];
  const projectOrder: string[] = [];
  const localesByProjectFile = new Map<string, Map<string, string[]>>();

  for (const configItem of result.data.projects) {
    let metadata;
    try {
      metadata = await fetchProjectMetadata({
        domainRoot,
        apiKey,
        org: result.data.org,
        project: configItem.project,
      });
    } catch (error) {
      console.error(
        styleText(
          "red",
          `✗ ${configItem.project} — ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      process.exit(1);
    }

    if (metadata.files.length === 0) {
      console.warn(
        styleText(
          "yellow",
          `  ${configItem.project}: no files configured on the server, skipping`,
        ),
      );
      continue;
    }
    if (metadata.languages.length === 0) {
      console.warn(
        styleText(
          "yellow",
          `  ${configItem.project}: no languages configured on the server, skipping`,
        ),
      );
      continue;
    }

    projectOrder.push(configItem.project);
    const fileMap = new Map<string, string[]>();
    localesByProjectFile.set(configItem.project, fileMap);

    for (const file of metadata.files) {
      const localesForFile: string[] = [];
      fileMap.set(file.filePath, localesForFile);

      for (const lang of metadata.languages) {
        localesForFile.push(lang.locale);
        tasks.push({
          domainRoot,
          apiKey,
          org: result.data.org,
          project: configItem.project,
          fileId: file.id,
          format: file.format,
          locale: lang.locale,
          output: resolveFilePath(file.filePath, lang.locale),
          branch: resolvedBranch,
          fileName: file.filePath,
        });
      }
    }
  }

  const total = tasks.length;
  let completed = 0;
  const isTTY = process.stdout.isTTY ?? false;

  // results[project][fileName][locale] = FetchResult
  const resultsMap = new Map<string, Map<string, Map<string, FetchResult>>>();
  for (const project of projectOrder) {
    const fileResults = new Map<string, Map<string, FetchResult>>();
    for (const fileName of localesByProjectFile.get(project)!.keys()) {
      fileResults.set(fileName, new Map());
    }
    resultsMap.set(project, fileResults);
  }

  if (isTTY) {
    process.stdout.write(renderProgressBar(0, total) + "\r");
  }

  for (let i = 0; i < tasks.length; i += CONCURRENCY_CALLS) {
    await Promise.all(
      tasks.slice(i, i + CONCURRENCY_CALLS).map(async (task) => {
        const fetchResult = await fetchTranslations(task);
        completed++;
        resultsMap
          .get(task.project)!
          .get(task.fileName)!
          .set(task.locale, fetchResult);

        if (isTTY) {
          process.stdout.write(renderProgressBar(completed, total) + "\r");
        } else {
          const counter = styleText("dim", `[${completed}/${total}]`);
          const label = `${task.project} / ${task.fileName} / ${task.locale}`;

          if (fetchResult.success) {
            console.log(
              `  ${counter} ${styleText("green", "✓")} ${styleText("bold", label)}`,
            );
          } else if ("skipped" in fetchResult) {
            console.log(
              `  ${counter} ${styleText("dim", "-")} ${styleText("bold", label)}`,
            );
          } else {
            console.log(
              `  ${counter} ${styleText("red", "✗")} ${styleText("bold", label)} — ${styleText("red", fetchResult.error)}`,
            );
          }
        }
      }),
    );
  }

  if (isTTY) {
    process.stdout.write("\r\x1b[K");
  }

  const failures: Array<{ label: string; error: string }> = [];
  let skippedCount = 0;

  for (const project of projectOrder) {
    const fileResults = resultsMap.get(project)!;
    const projectFiles = localesByProjectFile.get(project)!;

    console.log(`  ${styleText("bold", project)}`);
    for (const [fileName, locales] of projectFiles.entries()) {
      const localeResults = fileResults.get(fileName)!;
      const statuses: string[] = [];
      for (const locale of locales) {
        const res = localeResults.get(locale);
        if (!res) continue;
        if (res.success) {
          statuses.push(styleText("green", `✓ ${locale}`));
        } else if ("skipped" in res) {
          statuses.push(styleText("dim", `- ${locale}`));
          skippedCount++;
        } else {
          statuses.push(styleText("red", `✗ ${locale}`));
          failures.push({
            label: `${project} / ${fileName} / ${locale}`,
            error: res.error,
          });
        }
      }
      console.log(
        `    ${styleText("dim", fileName.padEnd(26))}: ${statuses.join(styleText("dim", "  "))}`,
      );
    }
  }

  console.log();

  const succeeded = total - failures.length - skippedCount;
  if (failures.length === 0) {
    if (skippedCount === 0) {
      console.log(
        styleText(
          ["green", "bold"],
          `✓ All ${total} translation${total > 1 ? "s" : ""} downloaded successfully`,
        ),
      );
    } else {
      if (succeeded > 0) {
        console.log(
          styleText(
            "green",
            `✓ ${succeeded} translation${succeeded > 1 ? "s" : ""} downloaded`,
          ),
        );
      }
      console.log(
        styleText(
          "dim",
          `- ${skippedCount} locale${skippedCount > 1 ? "s" : ""} skipped (no translations)`,
        ),
      );
    }
  } else {
    if (succeeded > 0) {
      console.log(
        styleText(
          "green",
          `✓ ${succeeded} translation${succeeded > 1 ? "s" : ""} downloaded`,
        ),
      );
    }
    if (skippedCount > 0) {
      console.log(
        styleText(
          "dim",
          `- ${skippedCount} locale${skippedCount > 1 ? "s" : ""} skipped (no translations)`,
        ),
      );
    }
    console.log(styleText(["red", "bold"], `✗ ${failures.length} failed:`));
    for (const failure of failures) {
      console.log(styleText("red", `    · ${failure.label}: ${failure.error}`));
    }
    console.log();
    process.exit(1);
  }

  console.log();
}
