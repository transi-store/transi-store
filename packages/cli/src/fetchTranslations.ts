import fs from "node:fs";
import path from "node:path";
import { describeFetchError } from "./fetchProjectMetadata.ts";

export const CONCURRENCY_CALLS = 5;

export type Config = {
  domainRoot: string;
  org: string;
  project: string;
  apiKey: string;
  fileId: number;
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
  fileId,
  format,
  locale,
  output,
  branch,
}: Config): Promise<FetchResult> {
  const params = new URLSearchParams({ format, locale });
  if (branch) {
    params.set("branch", branch);
  }
  const url = `${domainRoot}/api/orgs/${org}/projects/${project}/files/${fileId}/translations?${params.toString()}`;

  let content: Response;
  try {
    content = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (error) {
    return {
      success: false,
      error: `${describeFetchError(error)} (${url})`,
      output,
    };
  }

  if (!content.ok) {
    const errorData = await content.text();
    return {
      success: false,
      error: `${content.status} ${content.statusText} — ${errorData.trim()}`,
      output,
    };
  }

  try {
    const dir = path.dirname(output);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = await content.text();
    fs.writeFileSync(output, data, "utf-8");

    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      output,
    };
  }
}
