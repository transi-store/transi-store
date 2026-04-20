#!/usr/bin/env node
import path from "node:path";
import { Command, Option } from "@commander-js/extra-typings";
import pc from "picocolors";
import { fetchTranslationsAndPrint, fetchForConfig } from "./fetchForConfig.ts";
import {
  fetchProjectMetadata,
  resolveFilePath,
  type ProjectFileMetadata,
} from "./fetchProjectMetadata.ts";
import {
  uploadForConfig,
  uploadTranslations,
  type UploadConfig,
} from "./uploadTranslations.ts";
import {
  DEFAULT_DOMAIN_ROOT,
  ALL_BRANCHES_VALUE,
  ImportStrategy,
} from "@transi-store/common";

const program = new Command();

const apiKeyOption = new Option(
  "-k, --api-key <apiKey>",
  "API key for authentication",
)
  .env("TRANSI_STORE_API_KEY")
  .makeOptionMandatory();

function pickFile(
  files: ProjectFileMetadata[],
  fileIdArg: string | undefined,
  projectName: string,
): ProjectFileMetadata {
  if (files.length === 0) {
    console.error(pc.red(`Project "${projectName}" has no files configured`));
    process.exit(1);
  }

  const firstFile = files[0]!;
  if (fileIdArg === undefined) {
    if (files.length === 1) {
      return firstFile;
    }
    console.error(
      pc.red(
        `Project "${projectName}" has ${files.length} files — use --file <id> to pick one.`,
      ),
    );
    for (const f of files) {
      console.error(pc.dim(`  ${f.id}\t${f.filePath}\t(${f.format})`));
    }
    process.exit(1);
  }

  const id = Number.parseInt(fileIdArg, 10);
  const found = files.find((f) => f.id === id);
  if (!found) {
    console.error(
      pc.red(`File id "${fileIdArg}" not found in project "${projectName}".`),
    );
    process.exit(1);
  }
  return found;
}

program
  .command("download")
  .description("Download translations for a project")
  .addOption(apiKeyOption)
  .requiredOption(
    "-d, --domain-root <domainRoot>",
    "Root domain to download translations from (default is https://transi-store.com)",
    DEFAULT_DOMAIN_ROOT,
  )
  .requiredOption("-o, --org <org>", "Organization slug")
  .requiredOption("-p, --project <project>", "Project slug")
  .requiredOption("-l, --locale <locale>", "Locale to export")
  .option(
    "-F, --file <fileId>",
    "Project file id (required when the project has more than one file)",
  )
  .option(
    "-b, --branch <branch>",
    `Branch slug (exports main + branch keys). Use "${ALL_BRANCHES_VALUE}" to export all branches`,
  )
  .action(async (options) => {
    const metadata = await fetchProjectMetadata({
      domainRoot: options.domainRoot,
      apiKey: options.apiKey,
      org: options.org,
      project: options.project,
    });
    const file = pickFile(metadata.files, options.file, options.project);

    fetchTranslationsAndPrint(
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
        fileName: path.basename(file.filePath),
        locale: options.locale,
      },
    );
  });

program
  .command("upload")
  .description("Upload translations for a project")
  .addOption(apiKeyOption)
  .requiredOption(
    "-d, --domain-root <domainRoot>",
    "Root domain to upload translations to (default is https://transi-store.com)",
    DEFAULT_DOMAIN_ROOT,
  )
  .requiredOption("-o, --org <org>", "Organization slug")
  .requiredOption("-p, --project <project>", "Project slug")
  .requiredOption("-l, --locale <locale>", "Target locale")
  .requiredOption("-I, --input <input>", "Input file path")
  .option(
    "-F, --file <fileId>",
    "Project file id (required when the project has more than one file)",
  )
  .option(
    "-s, --strategy <strategy>",
    `Import strategy: '${ImportStrategy.OVERWRITE}' or '${ImportStrategy.SKIP}' existing translations`,
    ImportStrategy.SKIP,
  )
  .option(
    "-b, --branch <branch>",
    "Branch slug (new keys will be created on this branch)",
  )
  .action(async (options) => {
    const strategy = options.strategy;
    if (
      strategy !== ImportStrategy.OVERWRITE &&
      strategy !== ImportStrategy.SKIP
    ) {
      console.error(
        `Invalid strategy. Use '${ImportStrategy.OVERWRITE}' or '${ImportStrategy.SKIP}'.`,
      );
      process.exit(1);
    }

    const metadata = await fetchProjectMetadata({
      domainRoot: options.domainRoot,
      apiKey: options.apiKey,
      org: options.org,
      project: options.project,
    });
    const file = pickFile(metadata.files, options.file, options.project);

    uploadTranslations({
      domainRoot: options.domainRoot,
      apiKey: options.apiKey,
      org: options.org,
      project: options.project,
      fileId: file.id,
      format: file.format,
      locale: options.locale,
      input: options.input,
      strategy,
      branch: options.branch,
      fileName: path.basename(file.filePath),
    } satisfies UploadConfig);
  });

program
  .command("download:config", { isDefault: true })
  .description("Use configuration from config file")
  .option(
    "-c, --config <config>",
    "Path to config file",
    "transi-store.config.json",
  )
  .option(
    "-b, --branch <branch>",
    `Branch slug (exports main + branch keys). Use "${ALL_BRANCHES_VALUE}" to export all branches`,
  )
  .addOption(apiKeyOption)
  .action((options) => {
    fetchForConfig(options.config, options.apiKey, options.branch);
  });

program
  .command("upload:config")
  .description("Upload translations using configuration from config file")
  .option(
    "-c, --config <config>",
    "Path to config file",
    "transi-store.config.json",
  )
  .option(
    "-b, --branch <branch>",
    "Branch slug (new keys will be created on this branch)",
  )
  .option(
    "-s, --strategy <strategy>",
    `Import strategy: '${ImportStrategy.OVERWRITE}' or '${ImportStrategy.SKIP}' existing translations`,
    ImportStrategy.SKIP,
  )
  .addOption(apiKeyOption)
  .action((options) => {
    const strategy = options.strategy;
    if (
      strategy !== ImportStrategy.OVERWRITE &&
      strategy !== ImportStrategy.SKIP
    ) {
      console.error(
        `Invalid strategy. Use '${ImportStrategy.OVERWRITE}' or '${ImportStrategy.SKIP}'.`,
      );
      process.exit(1);
    }

    uploadForConfig(options.config, options.apiKey, strategy, options.branch);
  });

program.parse();
