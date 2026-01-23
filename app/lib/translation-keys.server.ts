import { db, schema } from "./db.server";
import { eq, and, inArray, like, or } from "drizzle-orm";

export async function getTranslationKeys(
  projectId: string,
  options?: {
    search?: string;
    limit?: number;
    offset?: number;
  }
) {
  const conditions = [eq(schema.translationKeys.projectId, projectId)];

  if (options?.search) {
    conditions.push(
      or(
        like(schema.translationKeys.keyName, `%${options.search}%`),
        like(schema.translationKeys.description, `%${options.search}%`)
      )!
    );
  }

  const keys = await db
    .select()
    .from(schema.translationKeys)
    .where(and(...conditions))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0)
    .orderBy(schema.translationKeys.keyName);

  return keys;
}

export async function getTranslationKeyById(keyId: string) {
  return await db.query.translationKeys.findFirst({
    where: eq(schema.translationKeys.id, keyId),
  });
}

export async function getTranslationKeyByName(
  projectId: string,
  keyName: string
) {
  return await db.query.translationKeys.findFirst({
    where: and(
      eq(schema.translationKeys.projectId, projectId),
      eq(schema.translationKeys.keyName, keyName)
    ),
  });
}

interface CreateTranslationKeyParams {
  projectId: string;
  keyName: string;
  description?: string;
}

export async function createTranslationKey(params: CreateTranslationKeyParams) {
  const keyId = crypto.randomUUID();

  await db.insert(schema.translationKeys).values({
    id: keyId,
    projectId: params.projectId,
    keyName: params.keyName,
    description: params.description,
  });

  return keyId;
}

interface UpdateTranslationKeyParams {
  keyId: string;
  keyName?: string;
  description?: string;
}

export async function updateTranslationKey(params: UpdateTranslationKeyParams) {
  const updates: Partial<typeof schema.translationKeys.$inferInsert> = {};

  if (params.keyName !== undefined) {
    updates.keyName = params.keyName;
  }

  if (params.description !== undefined) {
    updates.description = params.description;
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.translationKeys)
      .set(updates)
      .where(eq(schema.translationKeys.id, params.keyId));
  }
}

export async function deleteTranslationKey(keyId: string) {
  await db
    .delete(schema.translationKeys)
    .where(eq(schema.translationKeys.id, keyId));
}

// Translation values management

export async function getTranslationsForKey(keyId: string) {
  return await db.query.translations.findMany({
    where: eq(schema.translations.keyId, keyId),
  });
}

interface UpsertTranslationParams {
  keyId: string;
  locale: string;
  value: string;
}

export async function upsertTranslation(params: UpsertTranslationParams) {
  // Check if translation exists
  const existing = await db.query.translations.findFirst({
    where: and(
      eq(schema.translations.keyId, params.keyId),
      eq(schema.translations.locale, params.locale)
    ),
  });

  if (existing) {
    // Update existing
    await db
      .update(schema.translations)
      .set({ value: params.value })
      .where(eq(schema.translations.id, existing.id));

    return existing.id;
  } else {
    // Create new
    const translationId = crypto.randomUUID();

    await db.insert(schema.translations).values({
      id: translationId,
      keyId: params.keyId,
      locale: params.locale,
      value: params.value,
    });

    return translationId;
  }
}

export async function deleteTranslation(keyId: string, locale: string) {
  await db
    .delete(schema.translations)
    .where(
      and(
        eq(schema.translations.keyId, keyId),
        eq(schema.translations.locale, locale)
      )
    );
}

// Get all translations for a project grouped by key
export async function getProjectTranslations(projectId: string) {
  // Get all keys for this project
  const keys = await db.query.translationKeys.findMany({
    where: eq(schema.translationKeys.projectId, projectId),
  });

  if (keys.length === 0) {
    return [];
  }

  const keyIds = keys.map((k) => k.id);

  // Get all translations for these keys
  const translations = await db.query.translations.findMany({
    where: inArray(schema.translations.keyId, keyIds),
  });

  // Combine in JavaScript
  return keys.map((key) => ({
    ...key,
    translations: translations.filter((t) => t.keyId === key.id),
  }));
}
