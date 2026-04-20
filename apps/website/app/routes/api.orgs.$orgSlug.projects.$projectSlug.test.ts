import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { SupportedFormat } from "@transi-store/common";
import * as schema from "../../drizzle/schema";
import { loader } from "./api.orgs.$orgSlug.projects.$projectSlug";
import { orgContext } from "~/middleware/api-auth";
import {
  cleanupDb,
  createOrganization,
  createProject,
  createProjectFile,
  createProjectLanguage,
  getTestDb,
} from "../../tests/test-db";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

describe("Project detail loader", () => {
  let org: schema.Organization;

  beforeEach(async () => {
    org = await createOrganization(getTestDb(), { slug: "test-org" });
  });

  afterEach(async () => {
    await cleanupDb();
  });

  function createOrgContext() {
    const ctx = new RouterContextProvider();
    ctx.set(orgContext, org);
    return ctx;
  }

  it("returns 404 when the project does not exist", async () => {
    const request = new Request(
      "https://example.com/api/orgs/test-org/projects/missing",
    );
    const response = await loader({
      request,
      params: { orgSlug: "test-org", projectSlug: "missing" },
      unstable_pattern: "/api/orgs/:orgSlug/projects/:projectSlug",
      context: createOrgContext(),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Project "missing" not found');
  });

  it("returns the project's files and languages", async () => {
    const project = await createProject(getTestDb(), org.id, {
      slug: "my-project",
    });
    const file1 = await createProjectFile(getTestDb(), {
      projectId: project.id,
      format: SupportedFormat.JSON,
      filePath: "locales/<lang>/common.json",
    });
    const file2 = await createProjectFile(getTestDb(), {
      projectId: project.id,
      format: SupportedFormat.YAML,
      filePath: "locales/<lang>/admin.yaml",
    });
    await createProjectLanguage(getTestDb(), project.id, {
      locale: "en",
      isDefault: true,
    });
    await createProjectLanguage(getTestDb(), project.id, {
      locale: "fr",
      isDefault: false,
    });

    const request = new Request(
      "https://example.com/api/orgs/test-org/projects/my-project",
    );
    const response = await loader({
      request,
      params: { orgSlug: "test-org", projectSlug: "my-project" },
      unstable_pattern: "/api/orgs/:orgSlug/projects/:projectSlug",
      context: createOrgContext(),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      files: [
        {
          id: file1.id,
          format: "json",
          filePath: "locales/<lang>/common.json",
        },
        { id: file2.id, format: "yaml", filePath: "locales/<lang>/admin.yaml" },
      ],
      languages: [
        { locale: "en", isDefault: true },
        { locale: "fr", isDefault: false },
      ],
    });
  });
});
