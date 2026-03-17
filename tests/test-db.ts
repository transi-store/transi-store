import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { pushSchema } from "drizzle-kit/api-postgres";
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as schema from "../drizzle/schema";
import { relations } from "../drizzle/relations";

export type TestDb = Awaited<ReturnType<typeof initTestDb>>;

let _db: TestDb | null = null;

export async function initTestDb() {
  const client = new PGlite();
  const db = drizzle({ client, relations });

  const { apply } = await pushSchema(schema, db);
  await apply();

  _db = db;
  return db;
}

export function getTestDb(): TestDb {
  if (!_db) {
    throw new Error(
      "Test DB not initialized. Make sure tests/setup-db.ts is in vitest setupFiles.",
    );
  }
  return _db;
}

export async function cleanupDb() {
  const db = getTestDb();
  const tables = Object.values(schema).filter((table) => is(table, PgTable));
  const tableNames = tables.map(getTableName).join(", ");
  await db.execute(sql.raw(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`));
}

// Factory functions

let orgCounter = 0;
export async function createOrganization(
  db: TestDb,
  overrides: Partial<schema.NewOrganization> = {},
) {
  orgCounter++;
  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: `Test Org ${orgCounter}`,
      slug: `test-org-${orgCounter}`,
      ...overrides,
    })
    .returning();
  return org;
}

let projectCounter = 0;
export async function createProject(
  db: TestDb,
  organizationId: number,
  overrides: Partial<schema.NewProject> = {},
) {
  projectCounter++;
  const [project] = await db
    .insert(schema.projects)
    .values({
      organizationId,
      name: `Test Project ${projectCounter}`,
      slug: `test-project-${projectCounter}`,
      ...overrides,
    })
    .returning();
  return project;
}

export async function createBranch(
  db: TestDb,
  projectId: number,
  overrides: Partial<schema.NewBranch> = {},
) {
  const [branch] = await db
    .insert(schema.branches)
    .values({
      projectId,
      name: "feature-branch",
      slug: "feature-branch",
      ...overrides,
    })
    .returning();
  return branch;
}

export async function createTranslationKey(
  db: TestDb,
  projectId: number,
  keyName: string,
  overrides: Partial<schema.NewTranslationKey> = {},
) {
  const [key] = await db
    .insert(schema.translationKeys)
    .values({
      projectId,
      keyName,
      ...overrides,
    })
    .returning();
  return key;
}

export async function createTranslation(
  db: TestDb,
  keyId: number,
  locale: string,
  value: string,
  overrides: Partial<schema.NewTranslation> = {},
) {
  const [translation] = await db
    .insert(schema.translations)
    .values({
      keyId,
      locale,
      value,
      ...overrides,
    })
    .returning();
  return translation;
}
