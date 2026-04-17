export type ProjectFileInfo = {
  id: number;
  name: string;
  format: string;
  filePath: string;
};

export type ProjectInfo = {
  files: ProjectFileInfo[];
  languages: Array<{ locale: string; isDefault: boolean }>;
};

/**
 * Fetches files and languages for a project from the combined API endpoint.
 */
export async function fetchProjectInfo(
  domainRoot: string,
  apiKey: string,
  org: string,
  projectSlug: string,
): Promise<ProjectInfo> {
  const url = `${domainRoot}/api/orgs/${org}/projects/${projectSlug}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to fetch project info for "${projectSlug}": ${response.status} ${response.statusText}${(body as { error?: string }).error ? ` — ${(body as { error?: string }).error}` : ""}`,
    );
  }

  return (await response.json()) as ProjectInfo;
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
