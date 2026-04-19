import { SupportedFormat } from "@transi-store/common";
import { db, schema } from "./db.server";
import type { ProjectFile } from "../../drizzle/schema";

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
