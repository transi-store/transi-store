#!/usr/bin/env node
import { Command, Option } from "@commander-js/extra-typings";
import {
  downloadOne,
  fetchForConfig,
  type DownloadOneOptions,
} from "./fetchForConfig.ts";
import {
  uploadForConfig,
  uploadOne,
  type UploadOneOptions,
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

function validateStrategy(strategy: string): ImportStrategy {
  if (
    strategy !== ImportStrategy.OVERWRITE &&
    strategy !== ImportStrategy.SKIP
  ) {
    console.error(
      `Invalid strategy. Use '${ImportStrategy.OVERWRITE}' or '${ImportStrategy.SKIP}'.`,
    );
    process.exit(1);
  }
  return strategy;
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
  .action((options) => {
    downloadOne({
      domainRoot: options.domainRoot,
      apiKey: options.apiKey,
      org: options.org,
      project: options.project,
      locale: options.locale,
      fileId: options.file,
      branch: options.branch,
    } satisfies DownloadOneOptions);
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
  .action((options) => {
    uploadOne({
      ...options,
      fileId: options.file,
      strategy: validateStrategy(options.strategy),
    } satisfies UploadOneOptions);
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
    uploadForConfig(
      options.config,
      options.apiKey,
      validateStrategy(options.strategy),
      options.branch,
    );
  });

program.parse();
