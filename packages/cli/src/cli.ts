#!/usr/bin/env node
import { Command, Option } from "@commander-js/extra-typings";
import { fetchTranslationsAndPrint, fetchForConfig } from "./fetchForConfig.ts";
import { type Config } from "./fetchTranslations.ts";
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
import { isGitRepository, getCurrentBranch } from "./git.ts";

const program = new Command();

const apiKeyOption = new Option(
  "-k, --api-key <apiKey>",
  "API key for authentication",
)
  .env("TRANSI_STORE_API_KEY")
  .makeOptionMandatory();

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
  .requiredOption("-O, --output <output>", "Output file path")
  .option("-f, --format <format>", "Export format (json, csv, etc.)", "json")
  .option(
    "-b, --branch <branch>",
    `Branch slug (exports main + branch keys). Use "${ALL_BRANCHES_VALUE}" to export all branches`,
  )
  .action(async (options) => {
    let branch = options.branch;
    if (!branch && (await isGitRepository())) {
      const currentBranch = await getCurrentBranch();
      if (currentBranch) {
        branch = currentBranch;
        console.log(`Git: auto-detected branch "${branch}"`);
      }
    }
    fetchTranslationsAndPrint({ ...options, branch } satisfies Config);
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
  .requiredOption("-I, --input <input>", "Input file path (JSON or XLIFF)")
  .option(
    "-s, --strategy <strategy>",
    `Import strategy: '${ImportStrategy.OVERWRITE}' or '${ImportStrategy.SKIP}' existing translations`,
    ImportStrategy.SKIP,
  )
  .option(
    "-f, --format <format>",
    "File format (json or xliff). Auto-detected from extension if omitted",
  )
  .option(
    "-b, --branch <branch>",
    "Branch slug (new keys will be created on this branch)",
  )
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

    uploadTranslations({
      ...options,
      strategy,
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
