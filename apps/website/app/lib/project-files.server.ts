import { SupportedFormat } from "@transi-store/common";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db.server";
import type { ProjectFile } from "../../drizzle/schema";

export async function getProjectFiles(
  projectId: number,
): Promise<ProjectFile[]> {
  return await db.query.projectFiles.findMany({
    where: { projectId },
    orderBy: (t, { asc }) => [asc(t.createdAt), asc(t.id)],
  });
}

export class DuplicateFilePathError extends Error {
  constructor(filePath: string) {
    super(`A file with path "${filePath}" already exists in this project`);
    this.name = "DuplicateFilePathError";
  }
}

type UpdateProjectFileParams = {
  format?: SupportedFormat;
  filePath?: string;
};

export async function updateProjectFile(
  projectId: number,
  fileId: number,
  params: UpdateProjectFileParams,
): Promise<ProjectFile | undefined> {
  try {
    const [file] = await db
      .update(schema.projectFiles)
      .set({
        ...(params.format !== undefined ? { format: params.format } : {}),
        ...(params.filePath !== undefined ? { filePath: params.filePath } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.projectFiles.id, fileId),
          eq(schema.projectFiles.projectId, projectId),
        ),
      )
      .returning();
    return file;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("unique_project_file_path") &&
      params.filePath !== undefined
    ) {
      throw new DuplicateFilePathError(params.filePath);
    }
    throw error;
  }
}

// Returns the project's default file, creating it if none exists.
// Until the UI lets users pick a file, every translation is attached to the
// project's first file.
// TODO [PROJECT_FILE]: remove this function once all per-project-file steps
// are complete (fileId will then always be provided explicitly by callers).
export async function getOrCreateDefaultProjectFile(
  projectId: number,
): Promise<ProjectFile> {
  const existing = await db.query.projectFiles.findFirst({
    where: { projectId },
    orderBy: (t, { asc }) => [asc(t.createdAt), asc(t.id)],
  });
  if (existing) {
    return existing;
  }

  const [file] = await db
    .insert(schema.projectFiles)
    .values({
      projectId,
      format: SupportedFormat.JSON,
      filePath: "<lang>.json",
    })
    .returning();

  return file;
}
