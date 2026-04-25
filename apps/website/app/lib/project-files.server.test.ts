import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupportedFormat } from "@transi-store/common";
import * as schema from "../../drizzle/schema";
import {
  getTestDb,
  cleanupDb,
  createOrganization,
  createProject,
  type TestDb,
} from "../../tests/test-db";
import {
  createProjectFile,
  deleteProjectFile,
  DuplicateFilePathError,
  getProjectFiles,
} from "./project-files.server";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

describe("createProjectFile", () => {
  let db: TestDb;
  let projectId: number;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();
    const org = await createOrganization(db);
    const project = await createProject(db, org.id);
    projectId = project.id;
  });

  it("creates a new file and returns it", async () => {
    const file = await createProjectFile(projectId, {
      filePath: "locales/<lang>/common.json",
      format: SupportedFormat.JSON,
    });

    expect(file.id).toBeGreaterThan(0);
    expect(file.projectId).toBe(projectId);
    expect(file.filePath).toBe("locales/<lang>/common.json");
    expect(file.format).toBe(SupportedFormat.JSON);

    const all = await getProjectFiles(projectId);
    expect(all).toHaveLength(1);
  });

  it("throws DuplicateFilePathError when the path already exists in the project", async () => {
    await createProjectFile(projectId, {
      filePath: "locales/<lang>/common.json",
      format: SupportedFormat.JSON,
    });

    await expect(
      createProjectFile(projectId, {
        filePath: "locales/<lang>/common.json",
        format: SupportedFormat.JSON,
      }),
    ).rejects.toBeInstanceOf(DuplicateFilePathError);
  });

  it("allows the same filePath in different projects", async () => {
    const org = await createOrganization(db, {
      name: "Other",
      slug: "other",
    });
    const otherProject = await createProject(db, org.id);

    await createProjectFile(projectId, {
      filePath: "locales/<lang>/common.json",
      format: SupportedFormat.JSON,
    });
    const other = await createProjectFile(otherProject.id, {
      filePath: "locales/<lang>/common.json",
      format: SupportedFormat.JSON,
    });

    expect(other.projectId).toBe(otherProject.id);
  });
});

describe("deleteProjectFile", () => {
  let db: TestDb;
  let projectId: number;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();
    const org = await createOrganization(db);
    const project = await createProject(db, org.id);
    projectId = project.id;
  });

  it("deletes an existing file", async () => {
    const file = await createProjectFile(projectId, {
      filePath: "locales/<lang>/common.json",
      format: SupportedFormat.JSON,
    });

    await deleteProjectFile(projectId, file.id);

    const all = await getProjectFiles(projectId);
    expect(all).toHaveLength(0);
  });

  it("does not delete a file belonging to another project", async () => {
    const org = await createOrganization(db, { name: "Other", slug: "other" });
    const otherProject = await createProject(db, org.id);
    const otherFile = await createProjectFile(otherProject.id, {
      filePath: "locales/<lang>/common.json",
      format: SupportedFormat.JSON,
    });

    await deleteProjectFile(projectId, otherFile.id);

    const all = await getProjectFiles(otherProject.id);
    expect(all).toHaveLength(1);
  });

  it("does not throw when the file does not exist", async () => {
    await expect(deleteProjectFile(projectId, 999999)).resolves.toBeUndefined();
  });
});
