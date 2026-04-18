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

export async function createProjectFile(params: CreateProjectFileParams) {
  const [file] = await db
    .insert(schema.projectFiles)
    .values({
      projectId: params.projectId,
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
