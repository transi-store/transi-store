import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildMergeBranchUrl, mergeBranch } from "./branchMerge.ts";

describe("buildMergeBranchUrl", () => {
  it("URL-encodes org, project and branch slugs", () => {
    expect(
      buildMergeBranchUrl({
        domainRoot: "https://transi-store.com",
        org: "my org",
        project: "my project",
        branch: "feature/branch",
      }),
    ).toBe(
      "https://transi-store.com/api/orgs/my%20org/projects/my%20project/branches/feature%2Fbranch/merge",
    );
  });

  it("adds the URL-encoded target branch as the into query parameter", () => {
    expect(
      buildMergeBranchUrl({
        domainRoot: "https://transi-store.com",
        org: "acme",
        project: "website",
        branch: "child",
        into: "feature/parent",
      }),
    ).toBe(
      "https://transi-store.com/api/orgs/acme/projects/website/branches/child/merge?into=feature%2Fparent",
    );
  });
});

describe("mergeBranch", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  }

  it("POSTs to the merge endpoint with the bearer token", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, keysMoved: 3, keysDeleted: 1, into: null }),
    );

    const result = await mergeBranch({
      domainRoot: "https://transi-store.com",
      apiKey: "secret",
      org: "acme",
      project: "website",
      branch: "feature-1",
    });

    expect(result).toEqual({
      ok: true,
      keysMoved: 3,
      keysDeleted: 1,
      into: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://transi-store.com/api/orgs/acme/projects/website/branches/feature-1/merge",
    );
    expect(init).toMatchObject({
      method: "POST",
      headers: { Authorization: "Bearer secret" },
    });
  });

  it("returns the branch the merge landed on", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        keysMoved: 2,
        keysDeleted: 1,
        into: "grand-parent",
      }),
    );

    const result = await mergeBranch({
      domainRoot: "https://transi-store.com",
      apiKey: "secret",
      org: "acme",
      project: "website",
      branch: "child",
      into: "parent",
    });

    expect(result).toEqual({
      ok: true,
      keysMoved: 2,
      keysDeleted: 1,
      into: "grand-parent",
    });
  });

  it("rejects an empty target branch without calling the API", async () => {
    const result = await mergeBranch({
      domainRoot: "https://transi-store.com",
      apiKey: "secret",
      org: "acme",
      project: "website",
      branch: "child",
      into: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Invalid --into");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an error when the success response body is malformed", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    const result = await mergeBranch({
      domainRoot: "https://transi-store.com",
      apiKey: "secret",
      org: "acme",
      project: "website",
      branch: "feature-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unexpected response from merge endpoint");
    }
  });

  it("returns the API error message when the response is not ok", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: 'Branch "feature-1" not found' },
        { status: 404, statusText: "Not Found" },
      ),
    );

    const result = await mergeBranch({
      domainRoot: "https://transi-store.com",
      apiKey: "secret",
      org: "acme",
      project: "website",
      branch: "feature-1",
    });

    expect(result).toEqual({
      ok: false,
      error:
        'Failed to merge branch (404 Not Found): Branch "feature-1" not found',
      status: 404,
    });
  });

  it("falls back to statusText when the body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("nope", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    const result = await mergeBranch({
      domainRoot: "https://transi-store.com",
      apiKey: "secret",
      org: "acme",
      project: "website",
      branch: "feature-1",
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Failed to merge branch (500 Internal Server Error): Internal Server Error",
      status: 500,
    });
  });

  it("returns a descriptive error when fetch itself throws", async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(new TypeError("fetch failed"), {
        cause: Object.assign(new Error("connect ECONNREFUSED"), {
          code: "ECONNREFUSED",
        }),
      }),
    );

    const result = await mergeBranch({
      domainRoot: "https://transi-store.com",
      apiKey: "secret",
      org: "acme",
      project: "website",
      branch: "feature-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Failed to merge branch at");
      expect(result.error).toContain("ECONNREFUSED");
    }
  });
});
