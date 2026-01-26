import { db, schema } from "./db.server";
import { eq, and, inArray } from "drizzle-orm";
import { searchTranslationKeys } from "./search-utils.server";

export async function getTranslationKeys(
  projectId: number,
  options?: {
    search?: string;
    limit?: number;
    offset?: number;
  },
) {
  const conditions = [eq(schema.translationKeys.projectId, projectId)];

  let keys;

  if (options?.search) {
    const searchQuery = options.search.trim();

    // Use fuzzy search with similarity scoring
    const keysWithSimilarity = await searchTranslationKeys(
      searchQuery,
      projectId,
      {
        limit: options?.limit || 50,
        offset: options?.offset || 0,
      },
    );

    keys = keysWithSimilarity.map((row) => row.key);
  } else {
    // No search query - use regular query ordered by keyName
    keys = await db
      .select()
      .from(schema.translationKeys)
      .where(and(...conditions))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0)
      .orderBy(schema.translationKeys.keyName);
  }

  if (keys.length === 0) {
    return [];
  }

  // Get translations for these keys
  const keyIds = keys.map((k) => k.id);
  const translations = await db
    .select()
    .from(schema.translations)
    .where(inArray(schema.translations.keyId, keyIds));

  // Combine keys with their translated locales
  return keys.map((key) => ({
    ...key,
    translatedLocales: translations
      .filter((t) => t.keyId === key.id)
      .map((t) => t.locale),
  }));
}

export async function getTranslationKeyById(keyId: number) {
  return await db.query.translationKeys.findFirst({
    where: { id: keyId },
  });
}

export async function getTranslationKeyByName(
  projectId: number,
  keyName: string,
) {
  return await db.query.translationKeys.findFirst({
    where: { projectId, keyName },
  });
}

interface CreateTranslationKeyParams {
  projectId: number;
  keyName: string;
  description?: string;
}

export async function createTranslationKey(params: CreateTranslationKeyParams) {
  const [key] = await db
    .insert(schema.translationKeys)
    .values({
      projectId: params.projectId,
      keyName: params.keyName,
      description: params.description,
    })
    .returning();

  return key.id;
}

interface UpdateTranslationKeyParams {
  keyId: number;
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

export async function deleteTranslationKey(keyId: number) {
  await db
    .delete(schema.translationKeys)
    .where(eq(schema.translationKeys.id, keyId));
}

export async function duplicateTranslationKey(keyId: number) {
  // Get the original key
  const originalKey = await getTranslationKeyById(keyId);
  
  if (!originalKey) {
    throw new Error("Translation key not found");
  }
  
  // Get the original translations
  const originalTranslations = await getTranslationsForKey(keyId);
  
  // Find a unique name for the duplicated key
  let newKeyName = `${originalKey.keyName} (copy)`;
  let counter = 2;
  
  // Check if the key name already exists and increment counter if needed
  while (await getTranslationKeyByName(originalKey.projectId, newKeyName)) {
    newKeyName = `${originalKey.keyName} (copy ${counter})`;
    counter++;
  }
  
  // Create the new key with the unique name
  const newKeyId = await createTranslationKey({
    projectId: originalKey.projectId,
    keyName: newKeyName,
    description: originalKey.description || undefined,
  });
  
  // Copy all translations to the new key in parallel
  await Promise.all(
    originalTranslations.map((translation) =>
      upsertTranslation({
        keyId: newKeyId,
        locale: translation.locale,
        value: translation.value,
      }),
    ),
  );
  
  return newKeyId;
}

// Translation values management

export async function getTranslationsForKey(keyId: number) {
  return await db.query.translations.findMany({
    where: { keyId },
  });
}

interface UpsertTranslationParams {
  keyId: number;
  locale: string;
  value: string;
}

export async function upsertTranslation(params: UpsertTranslationParams) {
  // Check if translation exists
  const existing = await db.query.translations.findFirst({
    where: { keyId: params.keyId, locale: params.locale },
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
    const [translation] = await db
      .insert(schema.translations)
      .values({
        keyId: params.keyId,
        locale: params.locale,
        value: params.value,
      })
      .returning();

    return translation.id;
  }
}

// Get all translations for a project grouped by key
export async function getProjectTranslations(projectId: number) {
  // Get all keys for this project, sorted alphabetically by keyName
  const keys = await db.query.translationKeys.findMany({
    where: { projectId },
    orderBy: { keyName: "asc" },
  });

  if (keys.length === 0) {
    return [];
  }

  const keyIds = keys.map((k) => k.id);

  // Get all translations for these keys
  const translations = await db.query.translations.findMany({
    where: { keyId: { in: keyIds } },
  });

  // Combine in JavaScript
  return keys.map((key) => ({
    ...key,
    translations: translations.filter((t) => t.keyId === key.id),
  }));
}
