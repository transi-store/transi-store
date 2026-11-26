import { describe, expect, it, vi } from "vitest";
import { runMergeForConfig } from "./mergeForConfig.ts";
import type { MergeBranchOptions, MergeBranchResult } from "./branchMerge.ts";

describe("runMergeForConfig", () => {
  it("calls merge once per project declared in the config", async () => {
    const merge = vi.fn(
      async (_options: MergeBranchOptions): Promise<MergeBranchResult> => ({
        ok: true,
        keysMoved: 2,
        keysDeleted: 0,
        into: null,
      }),
    );

    const summary = await runMergeForConfig(
      "transi-store.config.json",
      "api-key",
      "feature-1",
      undefined,
      {
        readConfig: async () => ({
          org: "acme",
          projects: [{ project: "website" }, { project: "mobile" }],
        }),
        merge,
      },
    );

    expect(merge).toHaveBeenCalledTimes(2);
    expect(merge.mock.calls[0]![0]).toMatchObject({
      domainRoot: "https://transi-store.com",
      apiKey: "api-key",
      org: "acme",
      project: "website",
      branch: "feature-1",
    });
    expect(merge.mock.calls[1]![0]).toMatchObject({
      project: "mobile",
      branch: "feature-1",
    });
    expect(summary).toMatchObject({ total: 2, succeeded: 2, failed: 0 });
    expect(summary.skipped).toBe(0);
  });

  it("uses the domainRoot from the config when provided", async () => {
    const merge = vi.fn(
      async (_options: MergeBranchOptions): Promise<MergeBranchResult> => ({
        ok: true,
        keysMoved: 0,
        keysDeleted: 0,
        into: null,
      }),
    );

    await runMergeForConfig(
      "transi-store.config.json",
      "api-key",
      "branch-x",
      undefined,
      {
        readConfig: async () => ({
          domainRoot: "https://staging.transi-store.com",
          org: "acme",
          projects: [{ project: "website" }],
        }),
        merge,
      },
    );

    expect(merge.mock.calls[0]![0]).toMatchObject({
      domainRoot: "https://staging.transi-store.com",
    });
  });

  it("passes the target branch to every merge", async () => {
    const merge = vi.fn(
      async (_options: MergeBranchOptions): Promise<MergeBranchResult> => ({
        ok: true,
        keysMoved: 1,
        keysDeleted: 0,
        into: "parent",
      }),
    );

    await runMergeForConfig(
      "transi-store.config.json",
      "api-key",
      "child",
      "parent",
      {
        readConfig: async () => ({
          org: "acme",
          projects: [{ project: "website" }, { project: "mobile" }],
        }),
        merge,
      },
    );

    expect(merge.mock.calls.map(([options]) => options.into)).toEqual([
      "parent",
      "parent",
    ]);
  });

  it("collects failures without throwing and reports them in the summary", async () => {
    const merge = vi.fn(
      async (options: MergeBranchOptions): Promise<MergeBranchResult> => {
        if (options.project === "mobile") {
          return { ok: false, error: "boom" };
        }
        return { ok: true, keysMoved: 1, keysDeleted: 0, into: null };
      },
    );

    const summary = await runMergeForConfig(
      "transi-store.config.json",
      "api-key",
      "feature-1",
      undefined,
      {
        readConfig: async () => ({
          org: "acme",
          projects: [{ project: "website" }, { project: "mobile" }],
        }),
        merge,
      },
    );

    expect(summary.total).toBe(2);
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.results[1]!.result).toEqual({ ok: false, error: "boom" });
  });

  it("skips projects where the branch does not exist", async () => {
    const merge = vi.fn(
      async (options: MergeBranchOptions): Promise<MergeBranchResult> => {
        if (options.project === "mobile") {
          return {
            ok: false,
            error: "branch not found",
            status: 404,
          };
        }
        return { ok: true, keysMoved: 1, keysDeleted: 0, into: null };
      },
    );

    const summary = await runMergeForConfig(
      "transi-store.config.json",
      "api-key",
      "feature-1",
      undefined,
      {
        readConfig: async () => ({
          org: "acme",
          projects: [{ project: "website" }, { project: "mobile" }],
        }),
        merge,
      },
    );

    expect(summary).toMatchObject({
      total: 2,
      succeeded: 1,
      skipped: 1,
      failed: 0,
    });
  });

  it("throws when the config does not match the schema", async () => {
    await expect(
      runMergeForConfig(
        "transi-store.config.json",
        "api-key",
        "feature-1",
        undefined,
        {
          readConfig: async () => ({ projects: [] }),
          merge: vi.fn(),
        },
      ),
    ).rejects.toThrow(/Config validation error/);
  });
});
