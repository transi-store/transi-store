// CLI command to export translations
import fs from "fs";
import "dotenv/config";
import { Command } from "@commander-js/extra-typings";

type Props = {
  org: string;
  project: string;
  apiKey: string;
  format: string;
  locale: string;
  output: string;
};

async function fetchTranslations({
  org,
  project,
  apiKey,
  format,
  locale,
  output,
}: Props) {
  const url = `https://transi-store.mapado.com/api/orgs/${org}/projects/${project}/export?format=${format}&locale=${locale}`;

  console.log(url);

  try {
    const content = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!content.ok) {
      console.error(
        `Failed to fetch translations: ${content.status} ${content.statusText}`,
      );
      process.exit(1);
    }

    const data = await content.text();

    fs.writeFileSync(output, data);

    console.log(`Translations exported to ${output}`);
  } catch (error) {
    console.error("Error exporting translations:", error);
    process.exit(1);
  }
}

const program = new Command()
  //   .command("export-translations")
  .description("Export translations for a project")
  .requiredOption("-o, --org <org>", "Organization slug")
  .requiredOption("-p, --project <project>", "Project slug")
  .requiredOption("-k, --api-key <apiKey>", "API key for authentication")
  .requiredOption("-l, --locale <locale>", "Locale to export")
  .requiredOption("-O, --output <output>", "Output file path")
  .option("-f, --format <format>", "Export format (json, csv, etc.)", "json");

program.parse();

const options = program.opts();

console.log(options);
fetchTranslations(options);
