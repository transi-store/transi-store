import fs from "node:fs";
import z from "zod";
import schema from "./schema.ts";

export type Config = {
  org: string;
  project: string;
  apiKey: string;
  format: string;
  locale: string;
  output: string;
};

export async function fetchTranslations({
  org,
  project,
  apiKey,
  format,
  locale,
  output,
}: Config) {
  const url = `https://transi-store.mapado.com/api/orgs/${org}/projects/${project}/export?format=${format}&locale=${locale}`;

  try {
    const content = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await content.json();

    if (!content.ok) {
      console.error(
        `Failed to fetch translations: ${content.status} ${content.statusText}\n`,
        data.error,
      );
      process.exit(1);
    }

    // create directory if not exists
    const dir = output.substring(0, output.lastIndexOf("/"));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
    console.log(
      `Translations for project "${project}" and locale "${locale}" "saved to "${output}"`,
    );
  } catch (error) {
    console.error("Error exporting translations:", error);
    process.exit(1);
  }
}

export async function fetchForConfig(configPath: string, apiKey: string) {
  const cwd = process.cwd();

  const fullPath = `${cwd}/${configPath}`;

  if (!fs.existsSync(fullPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  const config = (await import(fullPath, { with: { type: "json" } })).default;
  const result = schema.safeParse(config);

  if (!result.success) {
    const pretty = z.prettifyError(result.error);
    console.error("Config validation error:", pretty);
    process.exit(1);
  }

  for (const configItem of result.data.projects) {
    for (const locale of configItem.langs) {
      const options = {
        org: result.data.org,
        project: configItem.project,
        apiKey,
        format: configItem.format,
        locale,
        output: configItem.output
          .replace("<lang>", locale)
          .replace("<project>", configItem.project)
          .replace("<format>", configItem.format),
      } satisfies Config;

      fetchTranslations(options);
    }
  }
}
