import fs from "node:fs";
import z from "zod";
import schema from "./schema.ts";

export const DEFAULT_DOMAIN_ROOT = "https://transi-store.com";

export type Config = {
  domainRoot: string;
  org: string;
  project: string;
  apiKey: string;
  format: string;
  locale: string;
  output: string;
};

export async function fetchTranslations({
  domainRoot,
  apiKey,
  org,
  project,
  format,
  locale,
  output,
}: Config) {
  const url = `${domainRoot}/api/orgs/${org}/projects/${project}/export?format=${format}&locale=${locale}`;

  try {
    const content = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!content.ok) {
      const errorData = await content.text();
      console.error(
        `Failed to fetch translations: ${content.status} ${content.statusText}\n`,
        errorData,
      );
      process.exit(1);
    }

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

export async function fetchForConfig(
  configPath: string,
  apiKey: string,
): Promise<void> {
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

  const domainRoot = result.data.domainRoot ?? DEFAULT_DOMAIN_ROOT;

  console.log(
    `Fetching translations from domain "${domainRoot}" for org "${result.data.org}"...`,
  );

  for (const configItem of result.data.projects) {
    for (const locale of configItem.langs) {
      const options = {
        domainRoot,
        apiKey,
        org: result.data.org,
        project: configItem.project,
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
