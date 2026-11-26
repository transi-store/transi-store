import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import * as schema from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { action } from "./api.orgs.$orgSlug.projects.$projectSlug.branches.$branchSlug.merge";
import { orgContext } from "~/middleware/api-auth.server";
import {
  cleanupDb,
  createBranch,
  createOrganization,
  createProject,
  createTranslationKey,
  getTestDb,
} from "../../tests/test-db";
import { BRANCH_STATUS } from "~/lib/branches";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

describe("Branch merge API", () => {
  let org: schema.Organization;
  let project: schema.Project;

  beforeEach(async () => {
    org = await createOrganization(getTestDb(), { slug: "test-org" });
    project = await createProject(getTestDb(), org.id, {
      name: "Test Project",
      slug: "test-project",
    });
  });

  afterEach(async () => {
    await cleanupDb();
  });

  function createOrgContext() {
    const ctx = new RouterContextProvider();
    ctx.set(orgContext, org);
    return ctx;
  }

  function callAction({
    orgSlug = "test-org",
    projectSlug = "test-project",
    branchSlug = "feature-branch",
    method = "POST",
    query = "",
  }: {
    orgSlug?: string;
    projectSlug?: string;
    branchSlug?: string;
    method?: string;
    query?: string;
  } = {}) {
    const request = new Request(
      `https://example.com/api/orgs/${orgSlug}/projects/${projectSlug}/branches/${branchSlug}/merge${query}`,
      { method },
    );
    return action({
      request,
      url: new URL(request.url),
      params: { orgSlug, projectSlug, branchSlug },
      pattern:
        "/api/orgs/:orgSlug/projects/:projectSlug/branches/:branchSlug/merge",
      context: createOrgContext(),
    });
  }

  it("merges an open branch and stores null mergedBy", async () => {
    const branch = await createBranch(getTestDb(), project.id);
    await createTranslationKey(getTestDb(), project.id, "branch.key", {
      branchId: branch.id,
    });

    const response = await callAction();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      keysMoved: 1,
      keysDeleted: 0,
      into: null,
    });

    const [merged] = await getTestDb()
      .select()
      .from(schema.branches)
      .where(eq(schema.branches.id, branch.id));
    expect(merged.status).toBe(BRANCH_STATUS.MERGED);
    expect(merged.mergedBy).toBeNull();
    expect(merged.mergedAt).not.toBeNull();
  });

  it("returns 405 when the request method is not POST", async () => {
    await createBranch(getTestDb(), project.id);

    const response = await callAction({ method: "GET" });

    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body.error).toBe("Method not allowed");
  });

  it("returns 404 when the project does not exist", async () => {
    const response = await callAction({ projectSlug: "missing" });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Project "missing" not found');
  });

  it("returns 404 when the branch does not exist", async () => {
    const response = await callAction({ branchSlug: "missing-branch" });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Branch "missing-branch" not found',
    });
  });

  it("returns 400 when the branch is already merged", async () => {
    const branch = await createBranch(getTestDb(), project.id, {
      status: BRANCH_STATUS.MERGED,
    });
    expect(branch.status).toBe(BRANCH_STATUS.MERGED);

    const response = await callAction();

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Branch "feature-branch" is already merged or closed',
    });
  });

  it("merges into the branch given by the into query parameter", async () => {
    const branch = await createBranch(getTestDb(), project.id);
    const key = await createTranslationKey(getTestDb(), project.id, "key", {
      branchId: branch.id,
    });

    const response = await callAction({ query: "?into=parent-branch" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      keysMoved: 1,
      keysDeleted: 0,
      into: "parent-branch",
    });

    const parent = await getTestDb().query.branches.findFirst({
      where: { projectId: project.id, slug: "parent-branch" },
    });
    const [movedKey] = await getTestDb()
      .select()
      .from(schema.translationKeys)
      .where(eq(schema.translationKeys.id, key.id));
    expect(movedKey.branchId).toBe(parent!.id);
  });

  it("returns 400 when into is empty", async () => {
    await createBranch(getTestDb(), project.id);

    const response = await callAction({ query: "?into=" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'The "into" parameter must be a branch slug',
    });
  });

  it("returns 400 when into is the merged branch itself", async () => {
    await createBranch(getTestDb(), project.id);

    const response = await callAction({ query: "?into=feature-branch" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Branch "feature-branch" cannot be merged into itself',
    });
  });
});
