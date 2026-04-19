import { db, schema } from "./db.server";
import { and, eq } from "drizzle-orm";
import type { SupportedFormat } from "@transi-store/common";

export async function getProjectFiles(projectId: number) {
  return await db.query.projectFiles.findMany({
    where: { projectId },
    orderBy: (t, { asc }) => asc(t.createdAt),
  });
}

type CreateProjectFileParams = {
  projectId: number;
  format: SupportedFormat;
  filePath: string;
};

export class DuplicateFilePathError extends Error {
  constructor(filePath: string) {
    super(`A file with path "${filePath}" already exists in this project`);
    this.name = "DuplicateFilePathError";
  }
}

export async function createProjectFile(params: CreateProjectFileParams) {
  try {
    const [file] = await db
      .insert(schema.projectFiles)
      .values({
        projectId: params.projectId,
        format: params.format,
        filePath: params.filePath,
      })
      .returning();

    return file;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("unique_project_file_path")
    ) {
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

export async function getProjectFileById(projectId: number, fileId: number) {
  return await db.query.projectFiles.findFirst({
    where: {
      id: fileId,
      projectId,
    },
  });
}

type UpdateProjectFileParams = {
  format?: SupportedFormat;
  filePath?: string;
};

export async function updateProjectFile(
  projectId: number,
  fileId: number,
  params: UpdateProjectFileParams,
) {
  const [file] = await db
    .update(schema.projectFiles)
    .set({
      ...(params.format !== undefined ? { format: params.format } : {}),
      ...(params.filePath !== undefined ? { filePath: params.filePath } : {}),
    })
    .where(
      and(
        eq(schema.projectFiles.id, fileId),
        eq(schema.projectFiles.projectId, projectId),
      ),
    )
    .returning();

  return file;
}

export async function isFilePathAvailable(
  projectId: number,
  filePath: string,
  excludeFileId?: number,
): Promise<boolean> {
  const existing = await db.query.projectFiles.findFirst({
    where: { projectId, filePath },
  });

  if (!existing) return true;
  if (excludeFileId !== undefined && existing.id === excludeFileId) return true;
  return false;
}
