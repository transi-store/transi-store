import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_DOMAIN_ROOT } from "@transi-store/common";
import { ImportStrategy } from "@transi-store/common";
import z from "zod";
import {
  getCurrentBranch,
  getDefaultBranch,
  getModifiedFiles,
  getModifiedFilesFromLastCommit,
  isGitRepository,
} from "./git.ts";
import { configSchema } from "@transi-store/common";

export type UploadConfig = {
  domainRoot: string;
  org: string;
  project: string;
  apiKey: string;
  locale: string;
  input: string;
  strategy: ImportStrategy;
  format?: string | undefined;
  branch?: string | undefined;
};

export async function uploadTranslations({
  domainRoot,
  apiKey,
  org,
  project,
  locale,
  input,
  strategy,
  format,
  branch,
}: UploadConfig) {
  const url = `${domainRoot}/api/orgs/${org}/projects/${project}/translations`;

  const filePath = path.resolve(input);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${input}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append("file", new Blob([fileContent]), fileName);
  formData.append("locale", locale);
  formData.append("strategy", strategy);

  if (format) {
    formData.append("format", format);
  }

  if (branch) {
    formData.append("branch", branch);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        `Failed to import translations: ${response.status} ${response.statusText}\n`,
        data.error,
        data.details ? `\nDetails: ${data.details}` : "",
      );
      process.exit(1);
    }

    console.log(
      `Translations imported for project "${project}" locale "${locale}":`,
    );
    console.log(`  Total keys: ${data.stats.total}`);
    console.log(`  Keys created: ${data.stats.keysCreated}`);
    console.log(`  Translations created: ${data.stats.translationsCreated}`);
    console.log(`  Translations updated: ${data.stats.translationsUpdated}`);
    console.log(`  Translations skipped: ${data.stats.translationsSkipped}`);
  } catch (error) {
    console.error("Error importing translations:", error);
    process.exit(1);
  }
}

export async function uploadForConfig(
  configPath: string,
  apiKey: string,
  strategy: ImportStrategy,
  branch?: string,
): Promise<void> {
  const cwd = process.cwd();

  const fullPath = path.resolve(cwd, configPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  const config = (
    await import(pathToFileURL(fullPath).href, { with: { type: "json" } })
  ).default;
  const result = configSchema.safeParse(config);

  if (!result.success) {
    const pretty = z.prettifyError(result.error);
    console.error("Config validation error:", pretty);
    process.exit(1);
  }

  const domainRoot = result.data.domainRoot ?? DEFAULT_DOMAIN_ROOT;

  console.log(
    `Uploading translations to domain "${domainRoot}" for org "${result.data.org}"...`,
  );

  // Determine if we can use git to skip unchanged files
  let modifiedFiles: Set<string> | null = null;

  if (await isGitRepository()) {
    const defaultBranch = await getDefaultBranch();
    const currentBranch = await getCurrentBranch();

    if (
      defaultBranch &&
      currentBranch &&
      currentBranch !== defaultBranch.replace(/^origin\//, "")
    ) {
      // On a feature branch: compare against the default branch
      modifiedFiles = await getModifiedFiles(defaultBranch);
      console.log(
        `Git optimization enabled: only uploading files modified compared to "${defaultBranch}"`,
      );
    } else {
      // On the default branch or detached HEAD (e.g. CI): compare against the previous commit
      modifiedFiles = await getModifiedFilesFromLastCommit();
      if (modifiedFiles) {
        console.log(
          `Git optimization enabled: only uploading files modified in the last commit`,
        );
      }
    }
  }

  for (const configItem of result.data.projects) {
    for (const locale of configItem.langs) {
      const input = configItem.output
        .replace("<lang>", locale)
        .replace("<project>", configItem.project)
        .replace("<format>", configItem.format);

      const resolvedInput = path.resolve(cwd, input);

      if (!fs.existsSync(resolvedInput)) {
        console.log(
          `Skipping project "${configItem.project}" locale "${locale}": file not found "${input}"`,
        );
        continue;
      }

      if (modifiedFiles && !modifiedFiles.has(resolvedInput)) {
        console.log(
          `Skipping project "${configItem.project}" locale "${locale}": file not modified`,
        );
        continue;
      }

      await uploadTranslations({
        domainRoot,
        apiKey,
        org: result.data.org,
        project: configItem.project,
        format: configItem.format,
        locale,
        input,
        strategy,
        branch,
      });
    }
  }
}
