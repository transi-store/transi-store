import fs from "node:fs";
import path from "node:path";
import { SupportedFormat } from "@transi-store/common";

export const CONCURRENCY_CALLS = 5;

export type Config = {
  domainRoot: string;
  org: string;
  project: string;
  apiKey: string;
  format: string;
  locale: string;
  output: string;
  branch?: string | undefined;
};

export type FetchResult =
  | { success: true; output: string }
  | { success: false; error: string; output: string };

export async function fetchTranslations({
  domainRoot,
  apiKey,
  org,
  project,
  format,
  locale,
  output,
  branch,
}: Config): Promise<FetchResult> {
  const params = new URLSearchParams({ format, locale });
  if (branch) {
    params.set("branch", branch);
  }
  const url = `${domainRoot}/api/orgs/${org}/projects/${project}/translations?${params.toString()}`;

  try {
    const content = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!content.ok) {
      const errorData = await content.text();
      return {
        success: false,
        error: `${content.status} ${content.statusText} — ${errorData.trim()}`,
        output,
      };
    }

    // create directory if not exists
    const dir = path.dirname(output);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // JSON format: parse and re-serialize with pretty-printing
    // Other formats: write raw text content as-is
    if (format === SupportedFormat.JSON) {
      const data = await content.json();
      fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
    } else {
      const data = await content.text();
      fs.writeFileSync(output, data, "utf-8");
    }

    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      output,
    };
  }
}
