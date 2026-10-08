import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImportStrategy, SupportedFormat } from "@transi-store/common";
import * as schema from "../../../drizzle/schema";
import {
  getTestDb,
  cleanupDb,
  createOrganization,
  createProject,
  createProjectFile,
  createProjectLanguage,
  createBranch,
  createTranslationKey,
  type TestDb,
} from "../../../tests/test-db";
import { getBranchKeyDeletions } from "../branches.server";
import { processImport } from "./process-import.server";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

function jsonFile(data: Record<string, string>): File {
  return new File([JSON.stringify(data)], "en.json", {
    type: "application/json",
  });
}

describe("processImport - baseFile", () => {
  let db: TestDb;
  let organizationId: number;
  let projectSlug: string;
  let projectId: number;
  let fileId: number;

  beforeEach(async () => {
    await cleanupDb();
    db = getTestDb();
    const org = await createOrganization(db);
    organizationId = org.id;
    const project = await createProject(db, org.id);
    projectSlug = project.slug;
    projectId = project.id;
    await createProjectLanguage(db, projectId, { locale: "en" });
    const file = await createProjectFile(db, {
      projectId,
      format: SupportedFormat.JSON,
      filePath: "locales/<lang>/common.json",
    });
    fileId = file.id;
  });

  function buildFormData({
    file,
    baseFile,
    branch,
  }: {
    file: File;
    baseFile?: File;
    branch?: string;
  }): FormData {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("locale", "en");
    formData.append("strategy", ImportStrategy.SKIP);
    if (baseFile) {
      formData.append("baseFile", baseFile);
    }
    if (branch) {
      formData.append("branch", branch);
    }
    return formData;
  }

  it("marks the keys removed since the base file for deletion", async () => {
    const branch = await createBranch(db, projectId);
    await createTranslationKey(db, projectId, "kept", { fileId });
    await createTranslationKey(db, projectId, "removed", { fileId });
    // Added on main after the branch was created: not in the base file, so
    // it must not be marked even though the branch file does not have it.
    await createTranslationKey(db, projectId, "added.on.main", { fileId });

    const result = await processImport({
      organizationId,
      projectSlug,
      fileId,
      formData: buildFormData({
        file: jsonFile({ kept: "Kept", added: "Added" }),
        baseFile: jsonFile({ kept: "Kept", removed: "Removed" }),
        branch: branch.slug,
      }),
    });

    expect(result).toEqual({
      success: true,
      importStats: expect.objectContaining({
        keysCreated: 1,
        keysMarkedForDeletion: 1,
        keysUnmarkedForDeletion: 0,
      }),
    });
    const marked = await getBranchKeyDeletions(branch.id);
    expect(marked.map((key) => key.keyName)).toEqual(["removed"]);
  });

  it("rejects a baseFile without a branch", async () => {
    const result = await processImport({
      organizationId,
      projectSlug,
      fileId,
      formData: buildFormData({
        file: jsonFile({ kept: "Kept" }),
        baseFile: jsonFile({ kept: "Kept", removed: "Removed" }),
      }),
    });

    expect(result).toEqual({
      success: false,
      error:
        "'baseFile' requires 'branch': deletions can only be marked on a branch",
    });
  });

  it("rejects a baseFile that cannot be parsed", async () => {
    const branch = await createBranch(db, projectId);

    const result = await processImport({
      organizationId,
      projectSlug,
      fileId,
      formData: buildFormData({
        file: jsonFile({ kept: "Kept" }),
        baseFile: new File(["not json"], "en.json"),
        branch: branch.slug,
      }),
    });

    expect(result).toMatchObject({
      success: false,
      error: "Unable to parse 'baseFile'",
    });
  });
});
