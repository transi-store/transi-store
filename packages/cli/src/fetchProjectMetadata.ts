import {
  createProjectDetailSchema,
  type ProjectDetail,
} from "@transi-store/common";

const projectDetailSchema = createProjectDetailSchema();

// Extract the useful part of a network-level fetch error. `fetch failed` on
// its own hides the actual reason (connection refused, DNS error, TLS) —
// Node attaches the underlying cause to error.cause.
export function describeFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code = (cause as Error & { code?: string }).code;
    return code
      ? `${error.message} (${code}: ${cause.message})`
      : `${error.message} (${cause.message})`;
  }
  return error.message;
}

type FetchProjectMetadataOptions = {
  domainRoot: string;
  apiKey: string;
  org: string;
  project: string;
};

export async function fetchProjectMetadata({
  domainRoot,
  apiKey,
  org,
  project,
}: FetchProjectMetadataOptions): Promise<ProjectDetail> {
  const url = `${domainRoot}/api/orgs/${org}/projects/${project}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to fetch project metadata at ${url}: ${describeFetchError(error)}`,
      { cause: error },
    );
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch project metadata at ${url} (${response.status} ${response.statusText}): ${body.trim()}`,
    );
  }

  const parsed = projectDetailSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      `Invalid project metadata response from ${url}: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}
