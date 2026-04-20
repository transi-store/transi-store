import { beforeAll, beforeEach, vi } from "vitest";
import { initTestDb, cleanupDb } from "./test-db";

beforeAll(async () => {
  await initTestDb();
});

beforeEach(async () => {
  await cleanupDb();
});

vi.mock("~/middleware/i18next", async () => {
  const { i18nextModuleMock } = await import("../tests/i18n-mock");

  return i18nextModuleMock;
});
