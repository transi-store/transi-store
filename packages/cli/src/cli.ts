#!/usr/bin/env node
import { Command, Option } from "@commander-js/extra-typings";
import {
  DEFAULT_DOMAIN_ROOT,
  fetchForConfig,
  fetchTranslations,
  type Config,
} from "./fetchTranslations.ts";

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
  .action((options) => {
    fetchTranslations(options satisfies Config);
  });

program
  .command("config", { isDefault: true })
  .description("Use configuration from config file")
  .option(
    "-c, --config <config>",
    "Path to config file",
    "transi-store.config.json",
  )
  .addOption(apiKeyOption)
  .action((options) => {
    fetchForConfig(options.config, options.apiKey);
  });

program.parse();
