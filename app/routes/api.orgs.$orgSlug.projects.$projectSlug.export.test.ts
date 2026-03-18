import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../../drizzle/schema";
import { loader } from "./api.orgs.$orgSlug.projects.$projectSlug.export";
import { RouterContextProvider } from "react-router";
import { orgContext } from "~/middleware/api-auth";
import {
  cleanupDb,
  createOrganization,
  createProject,
  createProjectLanguage,
  createTranslation,
  createTranslationKey,
  getTestDb,
} from "../../tests/test-db";

vi.mock("~/lib/db.server", () => ({
  get db() {
    return getTestDb();
  },
  schema,
}));

describe("Export Project Loader", () => {
  let org: schema.Organization;

  beforeEach(async () => {
    org = await createOrganization(getTestDb(), {
      slug: "test-org",
    });

    await createProject(getTestDb(), org.id, {
      name: "Test Project 1",
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

  it("should return 404 if project does not exist", async () => {
    const request = new Request(
      "https://example.com/api/orgs/test-org/projects/non-existent-project/export",
    );

    const response = await loader({
      request,
      params: { orgSlug: "test-org", projectSlug: "non-existent-project" },
      unstable_pattern: "/api/orgs/:orgSlug/projects/:projectSlug/export",
      context: createOrgContext(),
    });

    expect(response.status).toBe(404);
    const data = await response.json();

    expect(data.error).toBe("Project not found");
  });

  it("should return 400 error when missing required parameters", async () => {
    const request = new Request(
      "https://example.com/api/orgs/test-org/projects/test-project/export",
    );

    const response = await loader({
      request,
      params: { orgSlug: "test-org", projectSlug: "test-project" },
      unstable_pattern: "/api/orgs/:orgSlug/projects/:projectSlug/export",
      context: createOrgContext(),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("No languages configured for this project");

    await createProjectLanguage(getTestDb(), 1);

    const response2 = await loader({
      request,
      params: { orgSlug: "test-org", projectSlug: "test-project" },
      unstable_pattern: "/api/orgs/:orgSlug/projects/:projectSlug/export",
      context: createOrgContext(),
    });

    expect(response2.status).toBe(400);
    const data2 = await response2.json();
    expect(data2.error).toBe(
      "Missing 'locale' parameter. Use ?format=json&locale=fr or ?format=json&all",
    );

    const response3 = await loader({
      request: new Request(
        "https://example.com/api/orgs/test-org/projects/test-project/export?locale=dk",
      ),
      params: { orgSlug: "test-org", projectSlug: "test-project" },
      unstable_pattern: "/api/orgs/:orgSlug/projects/:projectSlug/export",
      context: createOrgContext(),
    });

    expect(response3.status).toBe(400);
    const data3 = await response3.json();
    expect(data3.error).toBe("Language 'dk' not found in this project");
  });

  it("should succeed with valid API key and existing project", async () => {
    await createProjectLanguage(getTestDb(), 1);
    await createTranslationKey(getTestDb(), 1, "test.key");
    await createTranslation(getTestDb(), 1, "en", "Test Value");

    const request = new Request(
      "https://example.com/api/orgs/test-org/projects/test-project/export?locale=en",
    );

    const response = await loader({
      request,
      params: { orgSlug: "test-org", projectSlug: "test-project" },
      unstable_pattern: "/api/orgs/:orgSlug/projects/:projectSlug/export",
      context: createOrgContext(),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    const data = await response.json();

    expect(data).toEqual({
      "test.key": "Test Value",
    });
  });
});
