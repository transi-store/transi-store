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

export async function getProjectFileById(
  projectId: number,
  fileId: number,
): Promise<ProjectFile | undefined> {
  return await db.query.projectFiles.findFirst({
    where: { projectId, id: fileId },
  });
}

export class DuplicateFilePathError extends Error {
  constructor(filePath: string) {
    super(`A file with path "${filePath}" already exists in this project`);
    this.name = "DuplicateFilePathError";
  }
}

function isDuplicateFilePathError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message.includes("unique_project_file_path")) return true;
  const cause = (error as Error & { cause?: unknown }).cause;
  if (
    cause instanceof Error &&
    cause.message.includes("unique_project_file_path")
  ) {
    return true;
  }
  return false;
}

type CreateProjectFileParams = {
  format: SupportedFormat;
  filePath: string;
};

export async function createProjectFile(
  projectId: number,
  params: CreateProjectFileParams,
): Promise<ProjectFile> {
  try {
    const [file] = await db
      .insert(schema.projectFiles)
      .values({
        projectId,
        format: params.format,
        filePath: params.filePath,
      })
      .returning();
    return file;
  } catch (error) {
    if (isDuplicateFilePathError(error)) {
      throw new DuplicateFilePathError(params.filePath);
    }
    throw error;
  }
}

export async function deleteProjectFile(
  projectId: number,
  fileId: number,
): Promise<void> {
  await db
    .delete(schema.projectFiles)
    .where(
      and(
        eq(schema.projectFiles.id, fileId),
        eq(schema.projectFiles.projectId, projectId),
      ),
    );
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
    if (params.filePath !== undefined && isDuplicateFilePathError(error)) {
      throw new DuplicateFilePathError(params.filePath);
    }
    throw error;
  }
}
