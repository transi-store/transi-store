import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_DOMAIN_ROOT } from "@transi-store/common";
import { ImportStrategy } from "@transi-store/common";
import z from "zod";
import {
  getDefaultBranch,
  getModifiedFiles,
  isGitRepository,
  resolveGitBranch,
} from "./git.ts";
import { configSchema } from "@transi-store/common";
import {
  describeFetchError,
  fetchProjectMetadata,
  pickFile,
  resolveFilePath,
} from "./fetchProjectMetadata.ts";

export type UploadOneOptions = {
  domainRoot: string;
  apiKey: string;
  org: string;
  project: string;
  locale: string;
  input: string;
  strategy: ImportStrategy;
  fileId?: string | undefined;
  branch?: string | undefined;
};

type UploadConfig = {
  domainRoot: string;
  org: string;
  project: string;
  apiKey: string;
  fileId: number;
  locale: string;
  input: string;
  strategy: ImportStrategy;
  format?: string | undefined;
  branch?: string | undefined;
  fileName?: string;
};

function logLabel({
  project,
  fileName,
  locale,
}: {
  project: string;
  fileName?: string | undefined;
  locale: string;
}): string {
  return fileName
    ? `project "${project}" file "${fileName}" locale "${locale}"`
    : `project "${project}" locale "${locale}"`;
}

// Direct upload flow used by the `upload` CLI command. Fetches project
// metadata, selects the target file, then delegates to uploadTranslations.
export async function uploadOne(options: UploadOneOptions): Promise<void> {
  const metadata = await fetchProjectMetadata({
    domainRoot: options.domainRoot,
    apiKey: options.apiKey,
    org: options.org,
    project: options.project,
  });
  const file = pickFile(metadata.files, options.fileId, options.project);

  await uploadTranslations({
    domainRoot: options.domainRoot,
    apiKey: options.apiKey,
    org: options.org,
    project: options.project,
    fileId: file.id,
    format: file.format,
    locale: options.locale,
    input: options.input,
    strategy: options.strategy,
    branch: options.branch,
    fileName: path.basename(file.filePath),
  });
}

async function uploadTranslations({
  domainRoot,
  apiKey,
  org,
  project,
  fileId,
  locale,
  input,
  strategy,
  format,
  branch,
  fileName,
}: UploadConfig) {
  const url = `${domainRoot}/api/orgs/${org}/projects/${project}/files/${fileId}/translations`;

  const filePath = path.resolve(input);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${input}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath);
  const uploadFileName = path.basename(filePath);

  const formData = new FormData();
  formData.append("file", new Blob([fileContent]), uploadFileName);
  formData.append("locale", locale);
  formData.append("strategy", strategy);

  if (format) {
    formData.append("format", format);
  }

  if (branch) {
    formData.append("branch", branch);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });
  } catch (error) {
    console.error(
      `Failed to import translations at ${url}: ${describeFetchError(error)}`,
    );
    process.exit(1);
  }

  try {
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
      `Translations imported for ${logLabel({ project, fileName, locale })}:`,
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

  // Auto-detect current git branch if not explicitly provided
  const { branch: resolvedBranch, wasAutoDetected } =
    await resolveGitBranch(branch);

  if (wasAutoDetected && resolvedBranch) {
    console.log(`Git: auto-detected branch "${resolvedBranch}"`);
  }

  console.log(
    `Uploading translations to domain "${domainRoot}" for org "${result.data.org}"...`,
  );

  // Determine if we can use git to skip unchanged files
  let modifiedFiles: Set<string> | null = null;

  if (await isGitRepository()) {
    const defaultBranch = await getDefaultBranch();

    if (defaultBranch) {
      modifiedFiles = await getModifiedFiles(defaultBranch);
      console.log(
        `Git optimization enabled: only uploading files modified compared to "${defaultBranch}"`,
      );
    }
  }

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
        `Failed to fetch metadata for project "${configItem.project}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      process.exit(1);
    }

    if (metadata.files.length === 0) {
      console.log(
        `Skipping project "${configItem.project}": no files configured on the server`,
      );
      continue;
    }
    if (metadata.languages.length === 0) {
      console.log(
        `Skipping project "${configItem.project}": no languages configured on the server`,
      );
      continue;
    }

    for (const file of metadata.files) {
      const fileName = path.basename(file.filePath);

      for (const lang of metadata.languages) {
        const locale = lang.locale;
        const input = resolveFilePath(file.filePath, locale);
        const resolvedInput = path.resolve(cwd, input);

        if (!fs.existsSync(resolvedInput)) {
          console.log(
            `Skipping ${logLabel({ project: configItem.project, fileName, locale })}: file not found "${input}"`,
          );
          continue;
        }

        if (modifiedFiles && !modifiedFiles.has(resolvedInput)) {
          console.log(
            `Skipping ${logLabel({ project: configItem.project, fileName, locale })}: file not modified`,
          );
          continue;
        }

        await uploadTranslations({
          domainRoot,
          apiKey,
          org: result.data.org,
          project: configItem.project,
          fileId: file.id,
          format: file.format,
          locale,
          input,
          strategy,
          branch: resolvedBranch,
          fileName,
        });
      }
    }
  }
}
