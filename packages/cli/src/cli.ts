#!/usr/bin/env node
import { Command } from "@commander-js/extra-typings";
import {
  fetchForConfig,
  fetchTranslations,
  type Config,
} from "./fetchTranslations.ts";

const program = new Command();

program
  .command("download")
  .description("Download translations for a project")
  .requiredOption("-o, --org <org>", "Organization slug")
  .requiredOption("-p, --project <project>", "Project slug")
  .requiredOption("-k, --api-key <apiKey>", "API key for authentication")
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
  .action((options) => {
    fetchForConfig(options.config);
  });

program.parse();
