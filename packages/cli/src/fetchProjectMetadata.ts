import pc from "picocolors";
import type { SupportedFormat } from "@transi-store/common";

type ProjectFileMetadata = {
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
    );
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch project metadata at ${url} (${response.status} ${response.statusText}): ${body.trim()}`,
    );
  }

  return (await response.json()) as ProjectMetadata;
}

// Replace the <lang> placeholder in a file path with an actual locale.
export function resolveFilePath(filePath: string, locale: string): string {
  return filePath.replace("<lang>", locale);
}

// Pick a file from the project's metadata. When fileIdArg is omitted and the
// project has exactly one file, that file is returned. Otherwise the CLI must
// exit with a helpful message, so this function calls process.exit on error.
export function pickFile(
  files: Array<ProjectFileMetadata>,
  fileIdArg: string | undefined,
  projectName: string,
): ProjectFileMetadata {
  if (files.length === 0) {
    console.error(pc.red(`Project "${projectName}" has no files configured`));
    process.exit(1);
  }

  const firstFile = files[0]!;
  if (fileIdArg === undefined) {
    if (files.length === 1) {
      return firstFile;
    }
    console.error(
      pc.red(
        `Project "${projectName}" has ${files.length} files — use --file <id> to pick one.`,
      ),
    );
    for (const f of files) {
      console.error(pc.dim(`  ${f.id}\t${f.filePath}\t(${f.format})`));
    }
    process.exit(1);
  }

  const id = Number.parseInt(fileIdArg, 10);
  const found = files.find((f) => f.id === id);
  if (!found) {
    console.error(
      pc.red(`File id "${fileIdArg}" not found in project "${projectName}".`),
    );
    process.exit(1);
  }
  return found;
}
