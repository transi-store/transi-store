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
      }),
    );

    const summary = await runMergeForConfig(
      "transi-store.config.json",
      "api-key",
      "feature-1",
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
      }),
    );

    await runMergeForConfig("transi-store.config.json", "api-key", "branch-x", {
      readConfig: async () => ({
        domainRoot: "https://staging.transi-store.com",
        org: "acme",
        projects: [{ project: "website" }],
      }),
      merge,
    });

    expect(merge.mock.calls[0]![0]).toMatchObject({
      domainRoot: "https://staging.transi-store.com",
    });
  });

  it("collects failures without throwing and reports them in the summary", async () => {
    const merge = vi.fn(
      async (options: MergeBranchOptions): Promise<MergeBranchResult> => {
        if (options.project === "mobile") {
          return { ok: false, error: "boom" };
        }
        return { ok: true, keysMoved: 1, keysDeleted: 0 };
      },
    );

    const summary = await runMergeForConfig(
      "transi-store.config.json",
      "api-key",
      "feature-1",
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
            reason: "not_found",
          };
        }
        return { ok: true, keysMoved: 1, keysDeleted: 0 };
      },
    );

    const summary = await runMergeForConfig(
      "transi-store.config.json",
      "api-key",
      "feature-1",
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
      runMergeForConfig("transi-store.config.json", "api-key", "feature-1", {
        readConfig: async () => ({ projects: [] }),
        merge: vi.fn(),
      }),
    ).rejects.toThrow(/Config validation error/);
  });
});
