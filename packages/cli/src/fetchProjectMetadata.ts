import type { SupportedFormat } from "@transi-store/common";

export type ProjectFileMetadata = {
  id: number;
  format: SupportedFormat;
  filePath: string;
};

type ProjectLanguageMetadata = {
  locale: string;
  isDefault: boolean;
};

type ProjectMetadata = {
  files: ProjectFileMetadata[];
  languages: ProjectLanguageMetadata[];
};

export async function fetchProjectMetadata({
  domainRoot,
  apiKey,
  org,
  project,
}: {
  domainRoot: string;
  apiKey: string;
  org: string;
  project: string;
}): Promise<ProjectMetadata> {
  const url = `${domainRoot}/api/orgs/${org}/projects/${project}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch project metadata (${response.status} ${response.statusText}): ${body.trim()}`,
    );
  }

  return (await response.json()) as ProjectMetadata;
}

// Replace the <lang> placeholder in a file path with an actual locale.
export function resolveFilePath(filePath: string, locale: string): string {
  return filePath.replace("<lang>", locale);
}
