import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_DOMAIN_ROOT } from "@transi-store/common";
import { ImportStrategy } from "@transi-store/common";
import z from "zod";
import { configSchema } from "@transi-store/common";
import { fetchProjectInfo, assertSafePath } from "./fetchProjectFiles.ts";
import { resolveGitBranch, getDefaultBranch, getModifiedFiles } from "./git.ts";

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
  fileId?: number | undefined;
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
  fileId,
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

  if (fileId !== undefined) {
    formData.append("fileId", String(fileId));
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
        (data as { error?: string }).error,
        (data as { details?: string }).details
          ? `\nDetails: ${(data as { details?: string }).details}`
          : "",
      );
      process.exit(1);
    }

    console.log(
      `Translations imported for project "${project}" file "${path.relative(process.cwd(), input)}" locale "${locale}":`,
    );
    const stats = (
      data as {
        stats: {
          total: number;
          keysCreated: number;
          translationsCreated: number;
          translationsUpdated: number;
          translationsSkipped: number;
        };
      }
    ).stats;
    console.log(`  Total keys: ${stats.total}`);
    console.log(`  Keys created: ${stats.keysCreated}`);
    console.log(`  Translations created: ${stats.translationsCreated}`);
    console.log(`  Translations updated: ${stats.translationsUpdated}`);
    console.log(`  Translations skipped: ${stats.translationsSkipped}`);
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

  // Auto-detect branch if not explicitly provided
  const { branch: resolvedBranch, wasAutoDetected } =
    await resolveGitBranch(branch);
  if (wasAutoDetected && resolvedBranch) {
    console.log(`Git: auto-detected branch "${resolvedBranch}"`);
  }

  // When on a feature branch, only upload files that changed vs the default branch
  let modifiedFiles: Set<string> | undefined;
  if (resolvedBranch) {
    const defaultBranch = await getDefaultBranch();
    if (defaultBranch) {
      console.log(
        `Git: comparing against "${defaultBranch}" to detect changed files`,
      );
      modifiedFiles = await getModifiedFiles(defaultBranch);
    }
  }

  console.log(
    `Uploading translations to domain "${domainRoot}" for org "${result.data.org}"...`,
  );

  for (const projectItem of result.data.projects) {
    const projectSlug = projectItem.slug;

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
        `Failed to fetch info for project "${projectSlug}": ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    }

    const { files, languages } = projectInfo;

    if (files.length === 0) {
      console.log(`Skipping project "${projectSlug}": no files configured`);
      continue;
    }

    for (const file of files) {
      for (const { locale } of languages) {
        const input = file.filePath.replace("<lang>", locale);
        const resolvedInput = path.resolve(cwd, input);

        // Security: prevent path traversal
        try {
          assertSafePath(
            resolvedInput,
            cwd,
            `${projectSlug}/${file.filePath}/${locale}`,
          );
        } catch (err) {
          console.error(String(err));
          process.exit(1);
        }

        if (!fs.existsSync(resolvedInput)) {
          console.log(
            `Skipping project "${projectSlug}" file "${file.filePath}" locale "${locale}": file not found "${input}"`,
          );
          continue;
        }

        if (modifiedFiles !== undefined && !modifiedFiles.has(resolvedInput)) {
          console.log(
            `Skipping project "${projectSlug}" file "${file.filePath}" locale "${locale}": not modified`,
          );
          continue;
        }

        await uploadTranslations({
          domainRoot,
          apiKey,
          org: result.data.org,
          project: projectSlug,
          format: file.format,
          locale,
          input: resolvedInput,
          strategy,
          branch: resolvedBranch,
          fileId: file.id,
        });
      }
    }
  }
}
