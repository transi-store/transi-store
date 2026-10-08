import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getFileContentAtRef, getMergeBase } from "./git.ts";

describe("git helpers", () => {
  const originalCwd = process.cwd();
  let repoDir: string;
  let forkCommit: string;

  function git(...args: Array<string>): string {
    return execFileSync("git", args, {
      cwd: repoDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  }

  function writeFile(relativePath: string, content: string): void {
    fs.writeFileSync(path.join(repoDir, relativePath), content);
  }

  beforeAll(() => {
    repoDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "transi-store-git-")),
    );
    git("init", "--initial-branch=main");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");

    fs.mkdirSync(path.join(repoDir, "locales"));
    writeFile("locales/en.json", '{"kept":"Kept","removed":"Removed"}');
    git("add", ".");
    git("commit", "-m", "initial");
    forkCommit = git("rev-parse", "HEAD");

    git("checkout", "-b", "feature");
    writeFile("locales/en.json", '{"kept":"Kept"}');
    git("commit", "-am", "remove a key");

    git("checkout", "main");
    writeFile("locales/fr.json", '{"kept":"Gardé"}');
    git("add", ".");
    git("commit", "-m", "advance main");
    git("checkout", "feature");

    // Run from a subdirectory to check that paths are resolved from the cwd
    process.chdir(path.join(repoDir, "locales"));
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  describe("getMergeBase", () => {
    it("returns the commit the branch was forked from", async () => {
      expect(await getMergeBase("main")).toBe(forkCommit);
    });

    it("returns null when the base ref does not exist", async () => {
      expect(await getMergeBase("unknown-branch")).toBeNull();
    });
  });

  describe("getFileContentAtRef", () => {
    it("returns the content of the file at the given ref", async () => {
      expect(
        await getFileContentAtRef(
          forkCommit,
          path.join(repoDir, "locales/en.json"),
        ),
      ).toBe('{"kept":"Kept","removed":"Removed"}');
    });

    it("returns null when the file does not exist at the given ref", async () => {
      expect(
        await getFileContentAtRef(
          forkCommit,
          path.join(repoDir, "locales/fr.json"),
        ),
      ).toBeNull();
    });
  });
});
