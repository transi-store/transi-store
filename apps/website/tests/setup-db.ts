import { beforeAll, beforeEach } from "vitest";
import { initTestDb, cleanupDb } from "./test-db";

beforeAll(async () => {
  await initTestDb();
});

beforeEach(async () => {
  await cleanupDb();
});
