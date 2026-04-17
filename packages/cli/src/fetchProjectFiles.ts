export type ProjectFileInfo = {
  id: number;
  name: string;
  format: string;
  output: string;
};

/**
 * Fetches the list of files configured for a project from the API.
 */
export async function fetchProjectFiles(
  domainRoot: string,
  apiKey: string,
  org: string,
  projectSlug: string,
): Promise<ProjectFileInfo[]> {
  const url = `${domainRoot}/api/orgs/${org}/projects/${projectSlug}/files`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to fetch files for project "${projectSlug}": ${response.status} ${response.statusText}${body.error ? ` — ${body.error}` : ""}`,
    );
  }

  return (await response.json()) as ProjectFileInfo[];
}

/**
 * Validates that a resolved output path does not escape the working directory.
 * Throws if path traversal is detected.
 */
export function assertSafePath(
  resolvedPath: string,
  cwd: string,
  label: string,
): void {
  const normalizedCwd = cwd.endsWith("/") ? cwd : `${cwd}/`;
  if (!resolvedPath.startsWith(normalizedCwd)) {
    throw new Error(
      `Security: resolved output path for "${label}" escapes working directory: ${resolvedPath}`,
    );
  }
}
