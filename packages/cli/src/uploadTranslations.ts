import fs from "node:fs";
import path from "node:path";

export enum ImportStrategy {
  OVERWRITE = "overwrite",
  SKIP = "skip",
}

export type UploadConfig = {
  domainRoot: string;
  org: string;
  project: string;
  apiKey: string;
  locale: string;
  input: string;
  strategy: ImportStrategy;
  format?: string;
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
}: UploadConfig) {
  const url = `${domainRoot}/api/orgs/${org}/projects/${project}/import`;

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
