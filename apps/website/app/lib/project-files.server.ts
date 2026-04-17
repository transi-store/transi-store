import { db, schema } from "./db.server";
import { and, eq } from "drizzle-orm";
import type { SupportedFormat } from "@transi-store/common";

/**
 * Validates that a file path is safe:
 * - Must not contain ".." segments (path traversal)
 * - Must not be an absolute path (starts with "/" or a drive letter on Windows)
 * - Must contain the "<lang>" placeholder
 */
export function validateOutputPath(filePath: string): string | null {
  if (!filePath.includes("<lang>")) {
    return "filePath must contain the '<lang>' placeholder";
  }
  // Reject absolute paths
  if (/^[/\\]/.test(filePath) || /^[a-zA-Z]:/.test(filePath)) {
    return "filePath must be a relative path";
  }
  // Reject path traversal sequences
  const parts = filePath.replace(/\\/g, "/").split("/");
  if (parts.some((p) => p === "..")) {
    return "filePath must not contain '..' segments";
  }
  return null;
}

export async function getProjectFiles(projectId: number) {
  return await db.query.projectFiles.findMany({
    where: { projectId },
    orderBy: (t, { asc }) => asc(t.createdAt),
  });
}

export async function getProjectFileById(fileId: number) {
  return await db.query.projectFiles.findFirst({
    where: { id: fileId },
  });
}

type CreateProjectFileParams = {
  projectId: number;
  name: string;
  format: SupportedFormat;
  filePath: string;
};

export async function createProjectFile(params: CreateProjectFileParams) {
  const [file] = await db
    .insert(schema.projectFiles)
    .values({
      projectId: params.projectId,
      name: params.name,
      format: params.format,
      filePath: params.filePath,
    })
    .returning();

  return file;
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
