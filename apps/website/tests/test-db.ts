import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { pushSchema } from "drizzle-kit/api-postgres";
import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as schema from "../drizzle/schema";
import { relations } from "../drizzle/relations";
import { incrementQueryCount } from "../app/lib/query-counter.server";
import { SupportedFormat } from "@transi-store/common";

export type TestDb = Awaited<ReturnType<typeof initTestDb>>;

let _db: TestDb | null = null;

export async function initTestDb() {
  const client = new PGlite();
  const db = drizzle({
    client,
    relations,
    logger: {
      logQuery() {
        incrementQueryCount();
      },
    },
  });

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

export async function cleanupDb(): Promise<void> {
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
): Promise<schema.Organization> {
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

export async function createApiKey(
  db: TestDb,
  organizationId: number,
  overrides: Partial<schema.NewApiKey> = {},
): Promise<schema.ApiKey> {
  const [user] = await db
    .insert(schema.users)
    .values({
      email: `user${Math.random()}@example.com`,
      name: "Test User",
      oauthProvider: "test",
      oauthSubject: `user-${Math.random()}`,
    })
    .returning();

  const userId = user.id;

  const [apiKey] = await db
    .insert(schema.apiKeys)
    .values({
      organizationId,
      keyValue: `test-api-key-${Math.random()}`,
      name: "Test API Key",
      createdBy: userId,
      ...overrides,
    })
    .returning();

  return apiKey;
}

let projectCounter = 0;
export async function createProject(
  db: TestDb,
  organizationId: number,
  overrides: Partial<schema.NewProject> = {},
): Promise<schema.Project> {
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

export async function createProjectLanguage(
  db: TestDb,
  projectId: number,
  overrides: Partial<schema.NewProjectLanguage> = {},
): Promise<schema.ProjectLanguage> {
  const [language] = await db
    .insert(schema.projectLanguages)
    .values({
      projectId,
      locale: "en",
      isDefault: true,
      ...overrides,
    })
    .returning();

  return language;
}

export async function createBranch(
  db: TestDb,
  projectId: number,
  overrides: Partial<schema.NewBranch> = {},
): Promise<schema.Branch> {
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

export async function createProjectFile(
  db: TestDb,
  projectId: number,
  overrides: Partial<schema.NewProjectFile> = {},
): Promise<schema.ProjectFile> {
  const [file] = await db
    .insert(schema.projectFiles)
    .values({
      projectId,
      format: SupportedFormat.JSON,
      filePath: "<lang>.json",
      ...overrides,
    })
    .returning();
  return file;
}

export async function createTranslationKey(
  db: TestDb,
  projectId: number,
  keyName: string,
  overrides: Partial<schema.NewTranslationKey> = {},
): Promise<schema.TranslationKey> {
  // TODO [PROJECT_FILE]: drop this fallback once all tests pass a fileId
  // explicitly via overrides.
  let fileId = overrides.fileId;
  if (!fileId) {
    // Reuse the project's first file if any, otherwise create a default one.
    const existing = await db.query.projectFiles.findFirst({
      where: { projectId },
      orderBy: (t, { asc }) => [asc(t.createdAt), asc(t.id)],
    });
    if (existing) {
      fileId = existing.id;
    } else {
      const [file] = await db
        .insert(schema.projectFiles)
        .values({
          projectId,
          format: SupportedFormat.JSON,
          filePath: "<lang>.json",
        })
        .returning();
      fileId = file.id;
    }
  }
  const [key] = await db
    .insert(schema.translationKeys)
    .values({
      projectId,
      keyName,
      ...overrides,
      fileId,
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
): Promise<schema.Translation> {
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
